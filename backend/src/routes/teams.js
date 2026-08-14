import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

const TEAM_COLORS = [
  "#9b59b6", "#e74c3c", "#3498db", "#f1c40f",
  "#2ecc71", "#e67e22", "#1abc9c", "#ff6b9d",
];

// Helper: verify organizer owns the game
async function verifyGameOwner(gameId, userId) {
  const result = await pool.query(
    `SELECT g.id FROM games g
     JOIN events e ON e.id = g.event_id
     WHERE g.id = $1 AND e.organizer_id = $2`,
    [gameId, userId]
  );
  return result.rows.length > 0;
}

// List teams for a game
router.get("/game/:gameId", authMiddleware, async (req, res) => {
  try {
    if (!(await verifyGameOwner(req.params.gameId, req.user.id))) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const result = await pool.query(
      "SELECT * FROM teams WHERE game_id = $1 ORDER BY id",
      [req.params.gameId]
    );
    res.json({ teams: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch teams" });
  }
});

// Create team (admin)
router.post("/", authMiddleware, async (req, res) => {
  const { game_id, name, color, discord_channel_id, discord_webhook_url, password } = req.body;
  if (!game_id || !name) {
    return res.status(400).json({ error: "Game ID and team name required" });
  }
  try {
    if (!(await verifyGameOwner(game_id, req.user.id))) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const count = await pool.query(
      "SELECT COUNT(*) AS cnt FROM teams WHERE game_id = $1",
      [game_id]
    );
    const teamColor = color || TEAM_COLORS[parseInt(count.rows[0].cnt) % TEAM_COLORS.length];
    const hash = password ? await bcrypt.hash(password, 10) : null;
    const result = await pool.query(
      `INSERT INTO teams (game_id, name, color, discord_channel_id, discord_webhook_url, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, game_id, name, color, discord_channel_id, position`,
      [game_id, name, teamColor, discord_channel_id || null, discord_webhook_url || null, hash]
    );
    res.json({ team: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to create team" });
  }
});

// Team login (public — by game code + team name + optional password)
router.post("/login", async (req, res) => {
  const { game_id, team_name, password } = req.body;
  if (!game_id || !team_name) {
    return res.status(400).json({ error: "Game ID and team name required" });
  }
  try {
    const result = await pool.query(
      "SELECT * FROM teams WHERE game_id = $1 AND name = $2",
      [game_id, team_name]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Team not found" });
    }
    const team = result.rows[0];
    if (team.password_hash) {
      if (!password) return res.status(401).json({ error: "Password required" });
      const valid = await bcrypt.compare(password, team.password_hash);
      if (!valid) return res.status(401).json({ error: "Incorrect password" });
    }
    res.json({
      team: {
        id: team.id,
        game_id: team.game_id,
        name: team.name,
        color: team.color,
        position: team.position,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Update team (admin)
router.put("/:id", authMiddleware, async (req, res) => {
  const { name, color, discord_channel_id, discord_webhook_url, position, password } = req.body;
  try {
    const team = await pool.query(
      `SELECT t.* FROM teams t
       JOIN games g ON g.id = t.game_id
       JOIN events e ON e.id = g.event_id
       WHERE t.id = $1 AND e.organizer_id = $2`,
      [req.params.id, req.user.id]
    );
    if (team.rows.length === 0) {
      return res.status(404).json({ error: "Team not found" });
    }
    const hash = password !== undefined
      ? (password ? await bcrypt.hash(password, 10) : null)
      : team.rows[0].password_hash;
    const result = await pool.query(
      `UPDATE teams SET
        name = COALESCE($1, name),
        color = COALESCE($2, color),
        discord_channel_id = COALESCE($3, discord_channel_id),
        discord_webhook_url = COALESCE($4, discord_webhook_url),
        position = COALESCE($5, position),
        password_hash = $6
       WHERE id = $7 RETURNING id, game_id, name, color, discord_channel_id, position`,
      [name, color, discord_channel_id, discord_webhook_url, position, hash, req.params.id]
    );
    res.json({ team: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to update team" });
  }
});

// Delete team (admin)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM teams USING games, events
       WHERE teams.id = $1
       AND games.id = teams.game_id
       AND events.id = games.event_id
       AND events.organizer_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete team" });
  }
});

export default router;
