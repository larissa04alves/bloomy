import { rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";

import { createDb, type Db } from "@bloomy/db/client";
import { user } from "@bloomy/db/schema/auth";
import { migrate } from "drizzle-orm/libsql/migrator";

const createdFiles: string[] = [];

export async function createTestDb(): Promise<Db> {
  // Arquivo temp único por chamada: ":memory:" do @libsql/client abre uma conexão
  // física separada dentro de db.transaction(), fazendo queries pós-transação não
  // enxergarem as tabelas (bug do driver). Arquivo real evita isso e mantém isolamento
  // entre testes.
  const file = path.join(tmpdir(), `bloomy-test-${randomUUID()}.db`);
  createdFiles.push(file);
  const db = createDb({ url: `file:${file}` });
  await migrate(db, {
    migrationsFolder: path.resolve(process.cwd(), "../../packages/db/src/migrations"),
  });
  return db;
}

export async function cleanupTestDbs(): Promise<void> {
  await Promise.all(
    createdFiles
      .splice(0)
      .flatMap((f) => [f, `${f}-wal`, `${f}-shm`].map((p) => rm(p, { force: true }))),
  );
}

export async function createTestUser(db: Db, id = "user-test"): Promise<string> {
  await db.insert(user).values({
    id,
    name: "Teste",
    email: `${id}@test.dev`,
  });
  return id;
}
