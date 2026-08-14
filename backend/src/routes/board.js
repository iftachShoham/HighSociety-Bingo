import { Router } from "express";
import { pool } from "../db/pool.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// Full board state for a game (public — used by both admin and team views)
router.get("/:gameId", async (req, res) => {
  try {
    const game = await pool.query(
      `SELECT g.*, e.name AS event_name
       FROM games g JOIN events e ON e.id = g.event_id
       WHERE g.id = $1`,
      [req.params.gameId]
    );
    if (game.rows.length === 0) {
      return res.status(404).json({ error: "Game not found" });
    }

    const tiles = await pool.query(
      "SELECT id, position, task_description, required_submissions, metadata FROM tiles WHERE game_id = $1 ORDER BY position",
      [req.params.gameId]
    );

    const teams = await pool.query(
      "SELECT id, name, color, position FROM teams WHERE game_id = $1 ORDER BY id",
      [req.params.gameId]
    );

    // Build completion map: { tile_id: { team_id: count } }
    const submissions = await pool.query(
      `SELECT s.team_id, s.tile_id, s.is_early_completion,
        COUNT(*) AS cnt
       FROM submissions s
       JOIN tiles t ON t.id = s.tile_id
       WHERE t.game_id = $1
       GROUP BY s.team_id, s.tile_id, s.is_early_completion`,
      [req.params.gameId]
    );

    const completion = {};
    for (const row of submissions.rows) {
      const key = `${row.tile_id}`;
      if (!completion[key]) completion[key] = {};
      const count = row.is_early_completion
        ? 999
        : (completion[key][row.team_id] || 0) + parseInt(row.cnt);
      completion[key][row.team_id] = Math.max(completion[key][row.team_id] || 0, count);
    }

    // Determine which tiles are fully completed by which teams
    const completedByTile = {};
    for (const tile of tiles.rows) {
      const tileKey = `${tile.id}`;
      const teamCounts = completion[tileKey] || {};
      completedByTile[tileKey] = [];
      for (const team of teams.rows) {
        if ((teamCounts[team.id] || 0) >= tile.required_submissions) {
          completedByTile[tileKey].push(team.id);
        }
      }
    }

    res.json({
      game: game.rows[0],
      tiles: tiles.rows,
      teams: teams.rows,
      completedByTile,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch board state" });
  }
});

// Activity log for a game
router.get("/:gameId/activity", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, t.name AS team_name, t.color AS team_color
       FROM activity_log a
       LEFT JOIN teams t ON t.id = a.team_id
       WHERE a.game_id = $1
       ORDER BY a.created_at DESC
       LIMIT 100`,
      [req.params.gameId]
    );
    res.json({ activity: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch activity log" });
  }
});

// Admin: move team to a tile position
router.post("/:gameId/move-team", authMiddleware, async (req, res) => {
  const { team_id, position } = req.body;
  try {
    const result = await pool.query(
      `UPDATE teams SET position = $1
       FROM games, events
       WHERE teams.id = $2
       AND games.id = teams.game_id
       AND events.id = games.event_id
       AND events.organizer_id = $3
       RETURNING teams.id, teams.name, teams.position`,
      [position, team_id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Team not found" });
    }
    await pool.query(
      `INSERT INTO activity_log (game_id, team_id, event_type, from_tile, to_tile, details)
       VALUES ($1, $2, 'ADMIN_MOVE', NULL, $3, $4)`,
      [req.params.gameId, team_id, position, `Admin moved team to tile ${position}`]
    );
    res.json({ team: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to move team" });
  }
});

// Admin: reset game (clear all submissions, positions, activity)
router.post("/:gameId/reset", authMiddleware, async (req, res) => {
  try {
    const game = await pool.query(
      `SELECT g.id FROM games g
       JOIN events e ON e.id = g.event_id
       WHERE g.id = $1 AND e.organizer_id = $2`,
      [req.params.gameId, req.user.id]
    );
    if (game.rows.length === 0) {
      return res.status(404).json({ error: "Game not found" });
    }
    await pool.query("DELETE FROM submissions WHERE tile_id IN (SELECT id FROM tiles WHERE game_id = $1)", [req.params.gameId]);
    await pool.query("UPDATE teams SET position = 0 WHERE game_id = $1", [req.params.gameId]);
    await pool.query("DELETE FROM activity_log WHERE game_id = $1", [req.params.gameId]);
    await pool.query(
      `INSERT INTO activity_log (game_id, event_type, details) VALUES ($1, 'RESET', 'Game reset by admin')`,
      [req.params.gameId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset game" });
  }
});

export default router;
