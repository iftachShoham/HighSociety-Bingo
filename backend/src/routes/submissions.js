import { Router } from "express";
import { pool } from "../db/pool.js";
import { sendDiscordWebhook } from "../utils/discord.js";

const router = Router();

// Submit proof for a tile (public — team auth via team_id)
router.post("/", async (req, res) => {
  const { team_id, tile_id, proof_url, submitted_by, is_early_completion } = req.body;
  if (!team_id || !tile_id || !proof_url) {
    return res.status(400).json({ error: "team_id, tile_id, and proof_url required" });
  }
  try {
    const team = await pool.query(
      `SELECT t.*, g.id AS game_id, g.status AS game_status, g.config AS game_config, g.game_type
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

    // Validate early completion: only allowed if tile allows it and required > 1
    let earlyCompletion = is_early_completion || false;
    if (earlyCompletion && (required <= 1 || !tile.rows[0].allow_early_submit)) {
      earlyCompletion = false;
    }

    const result = await pool.query(
      `INSERT INTO submissions (team_id, tile_id, proof_url, submitted_by, is_early_completion)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [team_id, tile_id, proof_url, submitted_by || null, earlyCompletion]
    );

    const newCount = earlyCompletion ? required : count + 1;
    const fullyCompleted = newCount >= required;

    await pool.query(
      `INSERT INTO activity_log (game_id, team_id, event_type, from_tile, to_tile, details)
       VALUES ($1, $2, $3, $4, $4, $5)`,
      [
        team.rows[0].game_id,
        team_id,
        earlyCompletion ? "EARLY_COMPLETE" : "COMPLETE",
        tile.rows[0].position,
        `${submitted_by || "Unknown"} submitted proof for tile ${tile.rows[0].position}`,
      ]
    );

    // Post to Discord on completion
    if (fullyCompleted && team.rows[0].discord_webhook_url) {
      const tileName = tile.rows[0].task_description || `Tile ${tile.rows[0].position}`;
      const msg = `✅ **${team.rows[0].name}** completed **Tile #${tile.rows[0].position}**: ${tileName}`;
      sendDiscordWebhook(team.rows[0].discord_webhook_url, msg, proof_url);
    }

    // Rat trigger: if tile is a rat tile and just completed, trigger rat effect
    let ratResult = null;
    if (fullyCompleted && tile.rows[0].is_rat_tile) {
      const gameConfig = typeof team.rows[0].game_config === "string"
        ? JSON.parse(team.rows[0].game_config)
        : team.rows[0].game_config || {};
      const ratsEnabled = gameConfig?.rats?.enabled !== false;
      if (ratsEnabled) {
        ratResult = await triggerRat(
          team.rows[0].game_id,
          team_id,
          team.rows[0].name,
          tile.rows[0].position,
          gameConfig?.rats?.selfProbability ?? 0.2
        );
      }
    }

    // Battleship attack: if game is battleship type and tile completed
    let battleResult = null;
    if (fullyCompleted && team.rows[0].game_type === "battleship") {
      battleResult = await triggerBattleshipAttack(
        team.rows[0].game_id,
        team_id,
        team.rows[0].name,
        tile.rows[0].position
      );
    }

    res.json({
      success: true,
      submission: result.rows[0],
      completion_count: newCount,
      required,
      fully_completed: fullyCompleted,
      rat_result: ratResult,
      battle_result: battleResult,
    });
  } catch (err) {
    console.error("Submission error:", err.message, err.stack);
    res.status(500).json({ error: "Failed to submit proof: " + err.message });
  }
});

// Rat trigger logic
async function triggerRat(gameId, landerTeamId, landerName, ratTile, selfProbability) {
  const teams = await pool.query(
    "SELECT id, name, discord_webhook_url FROM teams WHERE game_id = $1",
    [gameId]
  );

  // Determine victim
  let victim;
  let selfRat = false;

  if (Math.random() < selfProbability) {
    selfRat = true;
    victim = teams.rows.find((t) => t.id === landerTeamId);
  } else {
    const otherTeams = teams.rows.filter((t) => t.id !== landerTeamId);
    if (otherTeams.length === 0) {
      selfRat = true;
      victim = teams.rows.find((t) => t.id === landerTeamId);
    } else {
      // Weight by number of completed tiles
      const completions = await pool.query(
        `SELECT s.team_id, COUNT(DISTINCT s.tile_id) as cnt
         FROM submissions s
         JOIN tiles t ON t.id = s.tile_id
         WHERE t.game_id = $1
         GROUP BY s.team_id`,
        [gameId]
      );
      const completionMap = {};
      completions.rows.forEach((r) => {
        completionMap[r.team_id] = parseInt(r.cnt);
      });
      const weights = otherTeams.map((t) => (completionMap[t.id] || 0) + 1);
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let pick = Math.random() * totalWeight;
      victim = otherTeams[otherTeams.length - 1];
      for (let i = 0; i < otherTeams.length; i++) {
        pick -= weights[i];
        if (pick <= 0) {
          victim = otherTeams[i];
          break;
        }
      }
    }
  }

  if (!victim) return null;

  // Revert one of the victim's completed tiles
  const completedTiles = await pool.query(
    `SELECT s.tile_id, t.position, t.task_description
     FROM submissions s
     JOIN tiles t ON t.id = s.tile_id
     WHERE t.game_id = $1 AND s.team_id = $2
     GROUP BY s.tile_id, t.position, t.task_description
     HAVING COUNT(*) >= (SELECT required_submissions FROM tiles WHERE id = s.tile_id)
        OR BOOL_OR(s.is_early_completion)`,
    [gameId, victim.id]
  );

  let revertedTile = null;
  if (completedTiles.rows.length > 0) {
    const target = completedTiles.rows[Math.floor(Math.random() * completedTiles.rows.length)];
    await pool.query(
      `DELETE FROM submissions WHERE id = (
        SELECT id FROM submissions WHERE team_id = $1 AND tile_id = $2 ORDER BY created_at DESC LIMIT 1
      )`,
      [victim.id, target.tile_id]
    );
    revertedTile = target;
  }

  await pool.query(
    `INSERT INTO activity_log (game_id, team_id, event_type, from_tile, to_tile, details)
     VALUES ($1, $2, 'RAT_TRIGGERED', $3, $3, $4)`,
    [
      gameId,
      landerTeamId,
      ratTile,
      `Rat triggered on tile ${ratTile} by ${landerName}. ${selfRat ? "Self-rat!" : `Victim: ${victim.name}`}. Reverted: ${revertedTile ? `tile ${revertedTile.position}` : "nothing"}`,
    ]
  );

  // Post to Discord
  if (victim.discord_webhook_url) {
    const msg = selfRat
      ? `🐀 **${landerName}** triggered a rat on themselves on tile ${ratTile}!`
      : `🐀 **${landerName}** triggered a rat on tile ${ratTile}! **${victim.name}** lost a completion${revertedTile ? ` (tile ${revertedTile.position}: ${revertedTile.task_description})` : ""}.`;
    sendDiscordWebhook(victim.discord_webhook_url, msg);
  }

  return {
    triggered: true,
    self_rat: selfRat,
    victim_name: victim.name,
    reverted_tile: revertedTile ? revertedTile.position : null,
  };
}

// Battleship attack logic
async function triggerBattleshipAttack(gameId, attackerTeamId, attackerName, position) {
  const enemies = await pool.query(
    "SELECT id, name, discord_webhook_url FROM teams WHERE game_id = $1 AND id != $2",
    [gameId, attackerTeamId]
  );

  const results = [];

  for (const enemy of enemies.rows) {
    const shipAtPos = await pool.query(
      "SELECT * FROM ship_placements WHERE team_id = $1 AND $2 = ANY(positions)",
      [enemy.id, position]
    );

    const hit = shipAtPos.rows.length > 0;
    const shipId = hit ? shipAtPos.rows[0].id : null;

    await pool.query(
      `INSERT INTO ship_attacks (game_id, attacker_team_id, target_team_id, position, hit, ship_placement_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [gameId, attackerTeamId, enemy.id, position, hit, shipId]
    );

    let sunk = false;
    let eliminated = false;
    let shipName = null;

    if (hit) {
      const ship = shipAtPos.rows[0];
      shipName = ship.ship_name;
      const hitsOnShip = await pool.query(
        "SELECT COUNT(DISTINCT position) AS cnt FROM ship_attacks WHERE ship_placement_id = $1 AND hit = true",
        [ship.id]
      );
      sunk = parseInt(hitsOnShip.rows[0].cnt) >= ship.ship_size;

      if (sunk) {
        const allShips = await pool.query("SELECT id, ship_size FROM ship_placements WHERE team_id = $1", [enemy.id]);
        let allSunk = true;
        for (const s of allShips.rows) {
          const hits = await pool.query(
            "SELECT COUNT(DISTINCT position) AS cnt FROM ship_attacks WHERE ship_placement_id = $1 AND hit = true",
            [s.id]
          );
          if (parseInt(hits.rows[0].cnt) < s.ship_size) { allSunk = false; break; }
        }
        eliminated = allSunk;
      }
    }

    results.push({ target_team: enemy.name, hit, sunk, eliminated, ship_name: shipName });

    // Post to victim's Discord
    if (enemy.discord_webhook_url) {
      let msg;
      if (eliminated) {
        msg = `💥 **${attackerName}** sank your last ship at position ${position}! You are ELIMINATED!`;
      } else if (sunk) {
        msg = `🚢💥 **${attackerName}** SANK your **${shipName}** at position ${position}!`;
      } else if (hit) {
        msg = `🎯 **${attackerName}** HIT your **${shipName}** at position ${position}!`;
      } else {
        msg = `🌊 **${attackerName}** fired at position ${position} — MISS!`;
      }
      sendDiscordWebhook(enemy.discord_webhook_url, msg);
    }
  }

  // Post to attacker's Discord
  const attacker = await pool.query("SELECT discord_webhook_url FROM teams WHERE id = $1", [attackerTeamId]);
  if (attacker.rows[0]?.discord_webhook_url) {
    const hits = results.filter((r) => r.hit).length;
    const sinks = results.filter((r) => r.sunk).length;
    const eliminations = results.filter((r) => r.eliminated);
    let msg = `🎯 You attacked position ${position}: ${hits} hit${hits !== 1 ? "s" : ""}`;
    if (sinks > 0) msg += `, ${sinks} ship${sinks !== 1 ? "s" : ""} sunk!`;
    if (eliminations.length > 0) msg += ` — ${eliminations.map((e) => e.target_team).join(", ")} eliminated!`;
    sendDiscordWebhook(attacker.rows[0].discord_webhook_url, msg);
  }

  await pool.query(
    `INSERT INTO activity_log (game_id, team_id, event_type, to_tile, details)
     VALUES ($1, $2, 'BATTLESHIP_ATTACK', $3, $4)`,
    [gameId, attackerTeamId, position, `${attackerName} attacked position ${position}: ${results.map((r) => `${r.target_team}: ${r.hit ? "HIT" : "MISS"}`).join(", ")}`]
  );

  return { position, attacks: results };
}

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
