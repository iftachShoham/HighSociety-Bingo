import express from "express";
import cors from "cors";
import multer from "multer";
import { readFileSync, mkdirSync } from "fs";
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

// Upload setup
const uploadDir = join(__dirname, "..", "uploads");
mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = (file.originalname.split(".").pop() || "png").toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use("/api/uploads", express.static(uploadDir));

// Upload endpoint
app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ url: `/api/uploads/${req.file.filename}` });
});

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
