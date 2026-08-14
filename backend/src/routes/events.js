import { Router } from "express";
import { pool } from "../db/pool.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// List organizer's events
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, COUNT(g.id) AS game_count
       FROM events e
       LEFT JOIN games g ON g.event_id = e.id
       WHERE e.organizer_id = $1
       GROUP BY e.id
       ORDER BY e.created_at DESC`,
      [req.user.id]
    );
    res.json({ events: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// Create event
router.post("/", authMiddleware, async (req, res) => {
  const { name, description, discord_guild_id } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  try {
    const result = await pool.query(
      `INSERT INTO events (organizer_id, name, description, discord_guild_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, name, description || null, discord_guild_id || null]
    );
    res.json({ event: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to create event" });
  }
});

// Get single event
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, COUNT(g.id) AS game_count
       FROM events e
       LEFT JOIN games g ON g.event_id = e.id
       WHERE e.id = $1 AND e.organizer_id = $2
       GROUP BY e.id`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json({ event: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

// Delete event
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM events WHERE id = $1 AND organizer_id = $2",
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete event" });
  }
});

export default router;
