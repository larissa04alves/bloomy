import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

export function createDb(config: { url: string; authToken?: string }) {
  const client = createClient(config);

  return drizzle({ client, schema });
}

export type Db = ReturnType<typeof createDb>;
