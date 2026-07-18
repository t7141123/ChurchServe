import { initializeDatabase } from "@/lib/server/db/schema";
import type { D1Database } from "@/lib/server/db/types";

async function getDbFromEnv() {
  const env = process.env as unknown as { DB?: D1Database };
  if (!env.DB) {
    throw new Error("D1 database not available. Run with wrangler.");
  }
  return env.DB;
}

async function main() {
  try {
    const db = await getDbFromEnv();
    await initializeDatabase(db);
    console.log("✅ Database initialized successfully");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
}

main();
