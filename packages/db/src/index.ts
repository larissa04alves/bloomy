import { env } from "@bloomy/env/server";

import { createDb } from "./client";

export { createDb, type Db } from "./client";

export const db = createDb({
  url: env.DATABASE_URL,
  authToken: env.DATABASE_AUTH_TOKEN,
});
