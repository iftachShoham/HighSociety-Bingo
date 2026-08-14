import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";
import { authMiddleware, signToken } from "../middleware/auth.js";

const router = Router();

// Register
router.post("/register", async (req, res) => {
  const { username, password, display_name } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, display_name)
       VALUES ($1, $2, $3) RETURNING id, username, display_name`,
      [username, hash, display_name || username]
    );
    const user = result.rows[0];
    const token = signToken(user);
    res.json({ user, token });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Username already taken" });
    }
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }
  try {
    const result = await pool.query(
      "SELECT id, username, display_name, password_hash FROM users WHERE username = $1",
      [username]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    delete user.password_hash;
    const token = signToken(user);
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Get current user
router.get("/me", authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

export default router;
