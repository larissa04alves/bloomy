import { sql } from "drizzle-orm";
import { integer } from "drizzle-orm/sqlite-core";

/** Timestamp em ms com default `unixepoch('subsecond')` — padrão de todos os schemas. */
export const timestampMs = (name: string) =>
  integer(name, { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull();
