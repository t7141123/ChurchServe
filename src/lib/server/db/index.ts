import type { D1Database } from "./types";

let db: D1Database | null = null;

export function getDb(database?: D1Database): D1Database {
  if (database) {
    db = database;
  }
  if (!db) {
    throw new Error("Database not initialized. Pass DB via Cloudflare context or set globally.");
  }
  return db;
}

export function setDb(database: D1Database) {
  db = database;
}
