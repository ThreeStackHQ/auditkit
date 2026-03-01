import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

let client: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!client) {
    const sql = postgres(connectionString, { max: 10 });
    client = drizzle(sql, { schema });
  }
  return client;
}

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_, prop) {
    return getDb()[prop as keyof ReturnType<typeof getDb>];
  },
});
