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

// Guest access — auto-generates a username + password, creates the account, and logs in.
// Returns the generated password so the caller can display/save it.
function randomString(len) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

router.post("/guest", async (req, res) => {
  const displayName = req.body?.display_name || "Guest";
  try {
    let username;
    let result;
    // Try a few times to get a unique generated username
    for (let attempt = 0; attempt < 5; attempt++) {
      username = `captain-${randomString(4)}`;
      const password = randomString(8);
      const hash = await bcrypt.hash(password, 10);
      try {
        result = await pool.query(
          `INSERT INTO users (username, password_hash, display_name)
           VALUES ($1, $2, $3) RETURNING id, username, display_name`,
          [username, hash, displayName]
        );
        const user = result.rows[0];
        const token = signToken(user);
        return res.json({ user, token, generated_password: password, generated_username: username });
      } catch (err) {
        if (err.code !== "23505") throw err; // retry only on unique violation
      }
    }
    res.status(500).json({ error: "Could not generate a unique account, try again" });
  } catch (err) {
    res.status(500).json({ error: "Guest access failed" });
  }
});

export default router;
