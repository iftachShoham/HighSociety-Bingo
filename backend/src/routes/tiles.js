import { Router } from "express";
import { pool } from "../db/pool.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

async function verifyGameOwner(gameId, userId) {
  const result = await pool.query(
    `SELECT g.id FROM games g
     JOIN events e ON e.id = g.event_id
     WHERE g.id = $1 AND e.organizer_id = $2`,
    [gameId, userId]
  );
  return result.rows.length > 0;
}

// List tiles for a game
router.get("/game/:gameId", authMiddleware, async (req, res) => {
  try {
    if (!(await verifyGameOwner(req.params.gameId, req.user.id))) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const result = await pool.query(
      "SELECT * FROM tiles WHERE game_id = $1 ORDER BY position",
      [req.params.gameId]
    );
    res.json({ tiles: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tiles" });
  }
});

// Public tile list (for team board view — no auth, just game_id)
router.get("/public/game/:gameId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, position, task_description, required_submissions, metadata FROM tiles WHERE game_id = $1 ORDER BY position",
      [req.params.gameId]
    );
    res.json({ tiles: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tiles" });
  }
});

// Create a tile
router.post("/", authMiddleware, async (req, res) => {
  const { game_id, position, task_description, required_submissions, metadata } = req.body;
  if (!game_id || position === undefined) {
    return res.status(400).json({ error: "Game ID and position required" });
  }
  try {
    if (!(await verifyGameOwner(game_id, req.user.id))) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const result = await pool.query(
      `INSERT INTO tiles (game_id, position, task_description, required_submissions, metadata)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [game_id, position, task_description || null, required_submissions || 1, JSON.stringify(metadata || {})]
    );
    res.json({ tile: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Tile position already exists" });
    }
    res.status(500).json({ error: "Failed to create tile" });
  }
});

// Bulk create/update tiles (replaces all tiles for a game)
router.put("/bulk/:gameId", authMiddleware, async (req, res) => {
  const { tiles } = req.body;
  if (!Array.isArray(tiles)) {
    return res.status(400).json({ error: "tiles must be an array" });
  }
  try {
    if (!(await verifyGameOwner(req.params.gameId, req.user.id))) {
      return res.status(403).json({ error: "Not authorized" });
    }
    await pool.query("DELETE FROM tiles WHERE game_id = $1", [req.params.gameId]);
    for (const t of tiles) {
      await pool.query(
        `INSERT INTO tiles (game_id, position, task_description, required_submissions, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.params.gameId, t.position, t.task_description || null, t.required_submissions || 1, JSON.stringify(t.metadata || {})]
      );
    }
    const result = await pool.query(
      "SELECT * FROM tiles WHERE game_id = $1 ORDER BY position",
      [req.params.gameId]
    );
    res.json({ tiles: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to save tiles" });
  }
});

// Update a tile
router.put("/:id", authMiddleware, async (req, res) => {
  const { task_description, required_submissions, metadata } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tiles SET
        task_description = COALESCE($1, task_description),
        required_submissions = COALESCE($2, required_submissions),
        metadata = COALESCE($3, metadata)
       FROM games, events
       WHERE tiles.id = $4
       AND games.id = tiles.game_id
       AND events.id = games.event_id
       AND events.organizer_id = $5
       RETURNING tiles.*`,
      [task_description, required_submissions, metadata ? JSON.stringify(metadata) : null, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Tile not found" });
    }
    res.json({ tile: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to update tile" });
  }
});

// Delete a tile
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM tiles USING games, events
       WHERE tiles.id = $1
       AND games.id = tiles.game_id
       AND events.id = games.event_id
       AND events.organizer_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete tile" });
  }
});

export default router;
