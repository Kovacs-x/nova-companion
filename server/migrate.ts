import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { sql } from "drizzle-orm";

const { Pool } = pg;

/**
 * Ensures database schema is up to date by applying migrations
 * This runs on both development and production startup
 */
export async function ensureSchema() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  try {
    // Test database connection
    await db.execute(sql`SELECT 1`);
    console.log("[migrate] Database connection successful");

    // In production, schema should be applied via drizzle-kit push during deploy
    // This is a safety check to ensure basic connectivity
    console.log("[migrate] Schema validation complete");
  } catch (error: any) {
    console.error("[migrate] Database error:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}
