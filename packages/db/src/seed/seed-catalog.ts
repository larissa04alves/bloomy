/**
 * Seed one-shot do catálogo de exercícios (idempotente).
 *
 * Rodar localmente 1x, com as credenciais do R2 e do Turso em `apps/web/.env`:
 *   cd packages/db && bun run db:seed:catalog
 *
 * Faz: baixa o CSV + os GIFs do repo omercotkd/exercises-gifs (commit fixado),
 * sobe cada GIF pro bucket R2 (`{id}.gif`) e faz upsert em `exercise_catalog`
 * com os campos crus + a curadoria PT (`CATALOG_PT`). Reexecutável: sobrescreve
 * o GIF e atualiza a linha.
 */
import path from "node:path";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

import { createDb } from "../client";
import { exerciseCatalog } from "../schema/workout";
import { CATALOG_PT } from "./catalog-pt";
import { parseExercisesCsv } from "./parse-csv";

// .env fica em apps/web/.env (mesmo padrão do drizzle.config).
dotenv.config({ path: path.resolve(import.meta.dir, "../../../../apps/web/.env") });

// Commit fixado do dataset (mesma origem do catalog-pt.json).
const COMMIT = "ebf642cd90fdf73a6c73e7127e93b607b12c229e";
const SOURCE = `https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@${COMMIT}`;
const CONCURRENCY = 8;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`env ${name} não definida — preencha apps/web/.env`);
  return v;
}

async function main() {
  const bucket = requireEnv("R2_BUCKET");
  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  const db = createDb({
    url: requireEnv("DATABASE_URL"),
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  const csv = await (await fetch(`${SOURCE}/exercises.csv`)).text();
  // filtra p/ os ids presentes na curadoria (dropa 0609 sem GIF + não-mapeados).
  const rows = parseExercisesCsv(csv).filter((r) => CATALOG_PT[r.id]);
  console.log(`seed: ${rows.length} exercícios a processar`);

  let ok = 0;
  const failures: string[] = [];

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    await Promise.all(
      rows.slice(i, i + CONCURRENCY).map(async (r) => {
        try {
          const res = await fetch(`${SOURCE}/assets/${r.id}.gif`);
          if (!res.ok) throw new Error(`GIF HTTP ${res.status}`);
          const body = new Uint8Array(await res.arrayBuffer());
          await r2.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: `${r.id}.gif`,
              Body: body,
              ContentType: "image/gif",
            }),
          );
          const pt = CATALOG_PT[r.id]!;
          const values = {
            id: r.id,
            name: r.name,
            namePt: pt.namePt,
            group: pt.group,
            bodyPart: r.bodyPart,
            target: r.target,
            equipment: r.equipment,
            secondaryMuscles: r.secondaryMuscles,
          };
          await db
            .insert(exerciseCatalog)
            .values(values)
            .onConflictDoUpdate({ target: exerciseCatalog.id, set: values });
          ok++;
        } catch (e) {
          failures.push(`${r.id} (${r.name}): ${(e as Error).message}`);
        }
      }),
    );
    console.log(`  ${Math.min(i + CONCURRENCY, rows.length)}/${rows.length}…`);
  }

  console.log(`seed ok: ${ok} exercícios; ${failures.length} falhas`);
  if (failures.length) {
    console.error("falhas:\n" + failures.slice(0, 30).join("\n"));
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
