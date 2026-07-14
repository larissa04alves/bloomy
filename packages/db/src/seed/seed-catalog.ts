import path from "node:path";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

import { createDb } from "../client";
import { exerciseCatalog } from "../schema/workout";
import { CATALOG_PT } from "./catalog-pt";
import { parseExercisesCsv } from "./parse-csv";

// .env fica em apps/web/.env (mesmo padrão do drizzle.config).
dotenv.config({
  path: path.resolve(import.meta.dir, "../../../../apps/web/.env"),
});

// Commit fixado do dataset (mesma origem do catalog-pt.json).
const COMMIT = "ebf642cd90fdf73a6c73e7127e93b607b12c229e";
const SOURCE = `https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@${COMMIT}`;
const CONCURRENCY = 5;
const RETRIES = 5;
const FETCH_TIMEOUT_MS = 15_000; // aborta conexões penduradas (CDN lento)

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`env ${name} não definida — preencha apps/web/.env`);
  return v;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Baixa o GIF com retry — o CDN (jsdelivr) recusa conexão (ECONNREFUSED) sob carga. */
async function fetchGifBytes(id: string): Promise<Uint8Array> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(`${SOURCE}/assets/${id}.gif`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return new Uint8Array(await res.arrayBuffer());
    } catch (e) {
      lastErr = e;
      if (attempt < RETRIES) await sleep(400 * attempt); // backoff linear
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
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

  const csv = await (
    await fetch(`${SOURCE}/exercises.csv`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
  ).text();
  // filtra p/ os ids presentes na curadoria (dropa 0609 sem GIF + não-mapeados).
  const rows = parseExercisesCsv(csv).filter((r) => CATALOG_PT[r.id]);
  console.log(`seed: ${rows.length} exercícios a processar`);

  let ok = 0;
  const failures: string[] = [];

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    await Promise.all(
      rows.slice(i, i + CONCURRENCY).map(async (r) => {
        try {
          const body = await fetchGifBytes(r.id);
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
