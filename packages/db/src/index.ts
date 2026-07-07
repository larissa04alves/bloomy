import { env } from "@bloomy/env/server";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

export function createDb(config?: { url: string; authToken?: string }) {
  const client = createClient(
    config ?? {
      url: env.DATABASE_URL,
      authToken: env.DATABASE_AUTH_TOKEN,
    },
  );

  return drizzle({ client, schema });
}

export type Db = ReturnType<typeof createDb>;

export const db = createDb();
