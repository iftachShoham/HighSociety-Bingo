import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "hsbingo",
  user: process.env.DB_USER || "hsbingo",
  password: process.env.DB_PASSWORD || "hsbingo",
});

pool.on("error", (err) => {
  console.error("Unexpected database error:", err);
  process.exit(-1);
});
