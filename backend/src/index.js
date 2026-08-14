import express from "express";
import cors from "cors";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { pool } from "./db/pool.js";
import authRoutes from "./routes/auth.js";
import eventRoutes from "./routes/events.js";
import gameRoutes from "./routes/games.js";
import teamRoutes from "./routes/teams.js";
import tileRoutes from "./routes/tiles.js";
import submissionRoutes from "./routes/submissions.js";
import boardRoutes from "./routes/board.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/tiles", tileRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/board", boardRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Initialize DB schema on startup
async function start() {
  try {
    const schema = readFileSync(join(__dirname, "db/schema.sql"), "utf-8");
    await pool.query(schema);
    console.log("✅ Database schema ready");
  } catch (err) {
    console.error("❌ Schema init failed:", err.message);
    process.exit(1);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 API server running on port ${PORT}`);
  });
}

start();
