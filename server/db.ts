// Blueprint reference: blueprint:javascript_database
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const connectionString = process.env.DATABASE_URL;

// Create PostgreSQL connection pool
// Works with both Replit's internal database and external databases (like Neon)
export const pool = new Pool({ 
  connectionString,
  // Enable SSL for external databases, disable for Replit internal database
  ssl: connectionString.includes('helium') || connectionString.includes('db.internal') 
    ? false 
    : { rejectUnauthorized: false }
});

export const db = drizzle(pool, { schema });
