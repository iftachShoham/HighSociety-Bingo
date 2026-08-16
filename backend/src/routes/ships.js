import { Router } from "express";
import { pool } from "../db/pool.js";
import { authMiddleware } from "../middleware/auth.js";
import { sendDiscordWebhook } from "../utils/discord.js";

const router = Router();

function getDefaultShips(boardSize) {
  if (boardSize <= 3) return [{ name: "Destroyer", size: 2 }, { name: "Patrol", size: 2 }];
  if (boardSize <= 4) return [{ name: "Cruiser", size: 3 }, { name: "Destroyer", size: 2 }, { name: "Patrol", size: 2 }];
  if (boardSize <= 5) return [{ name: "Battleship", size: 4 }, { name: "Cruiser", size: 3 }, { name: "Destroyer", size: 2 }, { name: "Patrol", size: 2 }];
  return [
    { name: "Carrier", size: 5 },
    { name: "Battleship", size: 4 },
    { name: "Cruiser", size: 3 },
    { name: "Submarine", size: 3 },
    { name: "Destroyer", size: 2 },
  ];
}

// Place ships for a team (replaces all previous placements)
router.post("/place", async (req, res) => {
  const { team_id, ships } = req.body;
  if (!team_id || !Array.isArray(ships)) {
    return res.status(400).json({ error: "team_id and ships array required" });
  }
  try {
    const teamResult = await pool.query(
      `SELECT t.*, g.config AS game_config, g.game_type, g.id AS game_id
       FROM teams t JOIN games g ON g.id = t.game_id
       WHERE t.id = $1`,
      [team_id]
    );
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: "Team not found" });
    }
    const team = teamResult.rows[0];
    if (team.game_type !== "battleship") {
      return res.status(400).json({ error: "Game is not a battleship game" });
    }

    const config = typeof team.game_config === "string" ? JSON.parse(team.game_config) : team.game_config || {};
    const boardSize = config.boardSize || 5;
    const configShips = config.ships || getDefaultShips(boardSize);

    if (ships.length !== configShips.length) {
      return res.status(400).json({ error: `Expected ${configShips.length} ships, got ${ships.length}` });
    }

    // Validate each ship
    const allPositions = new Set();
    for (let i = 0; i < ships.length; i++) {
      const ship = ships[i];
      if (!ship.positions || ship.positions.length !== ship.size) {
        return res.status(400).json({ error: `${ship.name}: size/positions mismatch` });
      }
      for (const pos of ship.positions) {
        if (pos < 1 || pos > boardSize * boardSize) {
          return res.status(400).json({ error: `Invalid position ${pos}` });
        }
        if (allPositions.has(pos)) {
          return res.status(400).json({ error: `Ships overlap at position ${pos}` });
        }
        allPositions.add(pos);
      }
      const sorted = [...ship.positions].sort((a, b) => a - b);
      const row0 = Math.floor((sorted[0] - 1) / boardSize);
      const isHorizontal = sorted.every((p, idx) => idx === 0 || p === sorted[idx - 1] + 1) &&
        Math.floor((sorted[sorted.length - 1] - 1) / boardSize) === row0;
      const isVertical = sorted.every((p, idx) => idx === 0 || p === sorted[idx - 1] + boardSize);
      if (!isHorizontal && !isVertical) {
        return res.status(400).json({ error: `${ship.name}: positions must be consecutive (horizontal or vertical)` });
      }
    }

    await pool.query("DELETE FROM ship_placements WHERE team_id = $1", [team_id]);
    for (const ship of ships) {
      await pool.query(
        `INSERT INTO ship_placements (game_id, team_id, ship_name, ship_size, positions)
         VALUES ($1, $2, $3, $4, $5)`,
        [team.game_id, team_id, ship.name, ship.size, ship.positions]
      );
    }

    await pool.query(
      `INSERT INTO activity_log (game_id, team_id, event_type, details)
       VALUES ($1, $2, 'SHIPS_PLACED', $3)`,
      [team.game_id, team_id, `${team.name} placed their ships`]
    );

    if (team.discord_webhook_url) {
      sendDiscordWebhook(team.discord_webhook_url, `🚢 **${team.name}** has placed their ships! Ready for battle.`);
    }

    res.json({ success: true, ships_placed: ships.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to place ships: " + err.message });
  }
});

// Get team's own placements (public — for team view)
router.get("/team/:teamId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM ship_placements WHERE team_id = $1 ORDER BY id",
      [req.params.teamId]
    );
    res.json({ ships: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch ship placements" });
  }
});

// Get all placements for a game (admin)
router.get("/game/:gameId", authMiddleware, async (req, res) => {
  try {
    const placements = await pool.query(
      `SELECT sp.*, t.name AS team_name, t.color AS team_color
       FROM ship_placements sp
       JOIN teams t ON t.id = sp.team_id
       WHERE sp.game_id = $1 ORDER BY t.id, sp.id`,
      [req.params.gameId]
    );
    res.json({ placements: placements.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch placements" });
  }
});

// Get battleship state for a game (public — used by team and admin views)
router.get("/game/:gameId/state", async (req, res) => {
  try {
    const teams = await pool.query(
      "SELECT id, name, color FROM teams WHERE game_id = $1 ORDER BY id",
      [req.params.gameId]
    );
    const placements = await pool.query(
      "SELECT * FROM ship_placements WHERE game_id = $1",
      [req.params.gameId]
    );
    const attacks = await pool.query(
      "SELECT * FROM ship_attacks WHERE game_id = $1 ORDER BY created_at",
      [req.params.gameId]
    );

    const state = {};
    for (const team of teams.rows) {
      const teamShips = placements.rows.filter((p) => p.team_id === team.id);
      const teamAttacks = attacks.rows.filter((a) => a.attacker_team_id === team.id);
      const attacksReceived = attacks.rows.filter((a) => a.target_team_id === team.id);

      const ships = teamShips.map((ship) => {
        const hitsOnShip = attacksReceived.filter((a) => a.ship_placement_id === ship.id && a.hit);
        const hitPositions = [...new Set(hitsOnShip.map((a) => a.position))];
        return {
          id: ship.id,
          ship_name: ship.ship_name,
          ship_size: ship.ship_size,
          positions: ship.positions,
          hit_positions: hitPositions,
          is_sunk: hitPositions.length >= ship.ship_size,
        };
      });

      state[team.id] = {
        team_id: team.id,
        team_name: team.name,
        team_color: team.color,
        ships_placed: teamShips.length > 0,
        ships,
        my_attacks: teamAttacks.map((a) => ({
          target_team_id: a.target_team_id,
          position: a.position,
          hit: a.hit,
        })),
        attacks_received: attacksReceived.map((a) => ({
          attacker_team_id: a.attacker_team_id,
          position: a.position,
          hit: a.hit,
        })),
        eliminated: teamShips.length > 0 && ships.every((s) => s.is_sunk),
      };
    }

    const activeTeams = Object.values(state).filter((s) => !s.eliminated && s.ships_placed);
    const winner = activeTeams.length === 1 ? activeTeams[0] : null;

    res.json({ state, winner });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch battleship state" });
  }
});

// Clear team's placements (admin)
router.delete("/team/:teamId", authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM ship_placements USING games, events, teams
       WHERE ship_placements.team_id = $1
       AND teams.id = ship_placements.team_id
       AND games.id = teams.game_id
       AND events.id = games.event_id
       AND events.organizer_id = $2`,
      [req.params.teamId, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear placements" });
  }
});

export { getDefaultShips };
export default router;
