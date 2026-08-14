import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { pool } from "./pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function initDB() {
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  try {
    await pool.query(schema);
    console.log("✅ Database schema initialized");
  } catch (err) {
    console.error("❌ Schema init failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDB();
