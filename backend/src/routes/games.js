import { Router } from "express";
import { pool } from "../db/pool.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// Generate a random join code
function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// List games for an event
router.get("/event/:eventId", authMiddleware, async (req, res) => {
  try {
    const ev = await pool.query(
      "SELECT id FROM events WHERE id = $1 AND organizer_id = $2",
      [req.params.eventId, req.user.id]
    );
    if (ev.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }
    const result = await pool.query(
      `SELECT g.*, COUNT(t.id) AS team_count
       FROM games g
       LEFT JOIN teams t ON t.game_id = g.id
       WHERE g.event_id = $1
       GROUP BY g.id
       ORDER BY g.created_at DESC`,
      [req.params.eventId]
    );
    res.json({ games: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch games" });
  }
});

// Create game
router.post("/", authMiddleware, async (req, res) => {
  const { event_id, name, game_type, config } = req.body;
  if (!event_id || !name) {
    return res.status(400).json({ error: "Event ID and name required" });
  }
  try {
    const ev = await pool.query(
      "SELECT id FROM events WHERE id = $1 AND organizer_id = $2",
      [event_id, req.user.id]
    );
    if (ev.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }
    const result = await pool.query(
      `INSERT INTO games (event_id, name, game_type, join_code, config)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [event_id, name, game_type || "bingo", genCode(), JSON.stringify(config || {})]
    );
    res.json({ game: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to create game" });
  }
});

// Get single game (by id, auth)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT g.*,
        (SELECT COUNT(*) FROM teams WHERE game_id = g.id) AS team_count,
        (SELECT COUNT(*) FROM tiles WHERE game_id = g.id) AS tile_count
       FROM games g
       JOIN events e ON e.id = g.event_id
       WHERE g.id = $1 AND e.organizer_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Game not found" });
    }
    res.json({ game: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch game" });
  }
});

// Get game by join code (public — for team login)
router.get("/code/:code", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT g.id, g.name, g.game_type, g.status, g.join_code, g.config,
        e.name AS event_name
       FROM games g
       JOIN events e ON e.id = g.event_id
       WHERE g.join_code = $1`,
      [req.params.code.toUpperCase()]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Invalid game code" });
    }
    res.json({ game: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch game" });
  }
});

// Update game
router.put("/:id", authMiddleware, async (req, res) => {
  const { name, status, config } = req.body;
  try {
    const result = await pool.query(
      `UPDATE games SET
        name = COALESCE($1, name),
        status = COALESCE($2, status),
        config = COALESCE($3, config)
       FROM events
       WHERE games.id = $4 AND events.id = games.event_id AND events.organizer_id = $5
       RETURNING games.*`,
      [name, status, config ? JSON.stringify(config) : null, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Game not found" });
    }
    res.json({ game: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to update game" });
  }
});

// Delete game
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM games USING events
       WHERE games.id = $1 AND events.id = games.event_id AND events.organizer_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete game" });
  }
});

export default router;
