import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

// Submit proof for a tile (public — team auth via team_id)
router.post("/", async (req, res) => {
  const { team_id, tile_id, proof_url, submitted_by, is_early_completion } = req.body;
  if (!team_id || !tile_id || !proof_url) {
    return res.status(400).json({ error: "team_id, tile_id, and proof_url required" });
  }
  try {
    const team = await pool.query(
      `SELECT t.*, g.id AS game_id, g.status AS game_status
       FROM teams t JOIN games g ON g.id = t.game_id
       WHERE t.id = $1`,
      [team_id]
    );
    if (team.rows.length === 0) {
      return res.status(404).json({ error: "Team not found" });
    }
    if (team.rows[0].game_status !== "active") {
      return res.status(400).json({ error: "Game is not active" });
    }

    const tile = await pool.query(
      "SELECT * FROM tiles WHERE id = $1 AND game_id = $2",
      [tile_id, team.rows[0].game_id]
    );
    if (tile.rows.length === 0) {
      return res.status(404).json({ error: "Tile not found" });
    }

    const required = tile.rows[0].required_submissions;
    const existing = await pool.query(
      "SELECT COUNT(*) AS cnt FROM submissions WHERE team_id = $1 AND tile_id = $2",
      [team_id, tile_id]
    );
    const count = parseInt(existing.rows[0].cnt);

    if (count >= required) {
      return res.json({
        success: false,
        message: "Tile already fully completed",
        completion_count: count,
        required,
      });
    }

    const result = await pool.query(
      `INSERT INTO submissions (team_id, tile_id, proof_url, submitted_by, is_early_completion)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [team_id, tile_id, proof_url, submitted_by || null, is_early_completion || false]
    );

    const newCount = is_early_completion ? required : count + 1;
    const fullyCompleted = newCount >= required;

    await pool.query(
      `INSERT INTO activity_log (game_id, team_id, event_type, from_tile, to_tile, details)
       VALUES ($1, $2, $3, $3, $4)`,
      [
        team.rows[0].game_id,
        team_id,
        is_early_completion ? "EARLY_COMPLETE" : "COMPLETE",
        tile.rows[0].position,
        `${submitted_by || "Unknown"} submitted proof for tile ${tile.rows[0].position}`,
      ]
    );

    res.json({
      success: true,
      submission: result.rows[0],
      completion_count: newCount,
      required,
      fully_completed: fullyCompleted,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit proof" });
  }
});

// List submissions for a team
router.get("/team/:teamId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, t.position AS tile_position, t.task_description
       FROM submissions s
       JOIN tiles t ON t.id = s.tile_id
       WHERE s.team_id = $1
       ORDER BY s.created_at DESC`,
      [req.params.teamId]
    );
    res.json({ submissions: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

// List submissions for a game (admin view)
router.get("/game/:gameId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, t.position AS tile_position, t.task_description,
        tm.name AS team_name, tm.color AS team_color
       FROM submissions s
       JOIN tiles t ON t.id = s.tile_id
       JOIN teams tm ON tm.id = s.team_id
       WHERE t.game_id = $1
       ORDER BY s.created_at DESC`,
      [req.params.gameId]
    );
    res.json({ submissions: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

// Delete a submission (admin revert)
router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM submissions
       WHERE id = $1
       RETURNING team_id, tile_id`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Submission not found" });
    }
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete submission" });
  }
});

export default router;
