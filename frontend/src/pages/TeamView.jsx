import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import BingoBoard from "../components/BingoBoard.jsx";
import ImageUpload from "../components/ImageUpload.jsx";
import ShipPlacement from "../components/ShipPlacement.jsx";

function buildTeamOverlays(shipState, teamId, teamColor) {
  if (!shipState?.state?.[teamId]) return null;
  const myState = shipState.state[teamId];
  const overlays = {};
  myState.ships.forEach((ship) => {
    ship.positions.forEach((pos) => {
      overlays[pos] = { ...overlays[pos], shipColor: teamColor, isShipSunk: ship.is_sunk };
    });
  });
  myState.attacks_received.forEach((attack) => {
    if (attack.hit) overlays[attack.position] = { ...overlays[attack.position], isHit: true };
  });
  myState.my_attacks.forEach((attack) => {
    overlays[attack.position] = { ...overlays[attack.position], attackHit: attack.hit, attackMiss: !attack.hit };
  });
  return overlays;
}

export default function TeamView() {
  const { code, teamId } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [team, setTeam] = useState(null);
  const [shipState, setShipState] = useState(null);
  const [teamShips, setTeamShips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTile, setSelectedTile] = useState(null);
  const [proofUrl, setProofUrl] = useState("");
  const [earlySubmit, setEarlySubmit] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [mySubmissions, setMySubmissions] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const gameData = await api.getGameByCode(code);
        const boardData = await api.getBoard(gameData.game.id);
        setBoard(boardData);
        const myTeam = boardData.teams.find((t) => t.id === parseInt(teamId));
        setTeam(myTeam);
        const subData = await api.listTeamSubmissions(teamId);
        setMySubmissions(subData.submissions || []);
        if (gameData.game.game_type === "battleship") {
          const shipData = await api.getShipState(gameData.game.id);
          setShipState(shipData);
          const myShips = await api.getTeamShips(teamId);
          setTeamShips(myShips.ships || []);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();

    const timer = setInterval(async () => {
      try {
        const gameData = await api.getGameByCode(code);
        const boardData = await api.getBoard(gameData.game.id);
        setBoard(boardData);
        if (gameData.game.game_type === "battleship") {
          const shipData = await api.getShipState(gameData.game.id);
          setShipState(shipData);
        }
      } catch {}
    }, 6000);
    return () => clearInterval(timer);
  }, [code, teamId]);

  async function submitProof(e) {
    e.preventDefault();
    setSubmitMsg("");
    if (!selectedTile || !proofUrl) return;
    try {
      const data = await api.submitProof({
        team_id: parseInt(teamId),
        tile_id: selectedTile.id,
        proof_url: proofUrl,
        submitted_by: team?.name || "Player",
        is_early_completion: earlySubmit,
      });
      if (data.success) {
        let msg = data.fully_completed ? "✅ Tile completed!" : `Submitted (${data.completion_count}/${data.required})`;
        if (data.rat_result?.triggered) {
          msg += data.rat_result.self_rat ? ` 🐀 You triggered a rat on yourself!` : ` 🐀 Rat triggered! ${data.rat_result.victim_name} lost a completion.`;
        }
        if (data.battle_result?.attacks) {
          const hits = data.battle_result.attacks.filter((a) => a.hit);
          const sinks = data.battle_result.attacks.filter((a) => a.sunk);
          const elims = data.battle_result.attacks.filter((a) => a.eliminated);
          if (hits.length > 0) msg += ` 🎯 Hit: ${hits.map((h) => h.target_team).join(", ")}`;
          if (sinks.length > 0) msg += ` 🚢💥 Sunk: ${sinks.map((s) => `${s.target_team}'s ${s.ship_name}`).join(", ")}`;
          if (elims.length > 0) msg += ` 💀 Eliminated: ${elims.map((e) => e.target_team).join(", ")}`;
          if (hits.length === 0) msg += ` 🌊 All misses!`;
        }
        setSubmitMsg(msg);
        setProofUrl("");
        setEarlySubmit(false);
        const subData = await api.listTeamSubmissions(teamId);
        setMySubmissions(subData.submissions || []);
        // Refresh ship state
        const gameData = await api.getGameByCode(code);
        if (gameData.game.game_type === "battleship") {
          const shipData = await api.getShipState(gameData.game.id);
          setShipState(shipData);
        }
      } else {
        setSubmitMsg(data.message);
      }
    } catch (err) {
      setSubmitMsg(err.message);
    }
  }

  if (loading) return <div className="page"><p style={{ color: "var(--text-muted)" }}>Loading…</p></div>;
  if (error) return <div className="page"><p className="error-msg">{error}</p></div>;
  if (!board || !team) return null;

  const { tiles, teams, completedByTile, game } = board;
  const config = typeof game.config === "string" ? JSON.parse(game.config) : game.config || {};
  const boardSize = config.boardSize || 5;
  const gridCols = Math.min(tiles.length, boardSize);
  const isBattleship = game.game_type === "battleship";
  const myState = shipState?.state?.[team.id];
  const hasShipsPlaced = teamShips.length > 0;

  // Battleship placing phase: show ship placement
  if (isBattleship && game.status === "placing") {
    return (
      <div className="page">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="team-header">
            <span className="team-color-dot" style={{ background: team.color }} />
            <div>
              <h1 className="page-title" style={{ marginBottom: 0, fontSize: "1.4rem" }}>{team.name}</h1>
              <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>{game.name} — Place Your Ships</p>
            </div>
          </div>
          <button className="btn-ghost" onClick={() => navigate(`/play/${code}`)}>Switch Team</button>
        </div>
        <ShipPlacement
          gameId={game.id}
          teamId={parseInt(teamId)}
          teamColor={team.color}
          boardSize={boardSize}
          configShips={config.ships}
        />
      </div>
    );
  }

  // Not active yet
  if (game.status !== "active") {
    return (
      <div className="page">
        <div className="team-header" style={{ marginBottom: 20 }}>
          <span className="team-color-dot" style={{ background: team.color }} />
          <div>
            <h1 className="page-title" style={{ marginBottom: 0, fontSize: "1.4rem" }}>{team.name}</h1>
            <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>{game.name}</p>
          </div>
        </div>
        <div className="card" style={{ textAlign: "center", color: "var(--text-muted)" }}>
          {isBattleship ? "Waiting for all teams to place their ships…" : "This game hasn't started yet. Check back soon!"}
        </div>
      </div>
    );
  }

  const overlays = isBattleship ? buildTeamOverlays(shipState, team.id, team.color) : null;

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div className="team-header">
          <span className="team-color-dot" style={{ background: team.color }} />
          <div>
            <h1 className="page-title" style={{ marginBottom: 0, fontSize: "1.4rem" }}>{team.name}</h1>
            <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>{game.name}</p>
          </div>
        </div>
        <button className="btn-ghost" onClick={() => navigate(`/play/${code}`)}>Switch Team</button>
      </div>

      {/* Winner banner */}
      {shipState?.winner && (
        <div className="card" style={{ textAlign: "center", borderColor: "var(--gold)", marginBottom: 16 }}>
          <div style={{ fontSize: "1.5rem" }}>🏆</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--gold)" }}>
            {shipState.winner.team_name} wins!
          </div>
        </div>
      )}

      {/* Eliminated banner */}
      {isBattleship && myState?.eliminated && (
        <div className="card" style={{ textAlign: "center", borderColor: "var(--red)", marginBottom: 16 }}>
          <div style={{ fontSize: "1.2rem", color: "var(--red)" }}>💀 All your ships have been sunk! You are eliminated.</div>
        </div>
      )}

      {selectedTile && !myState?.eliminated && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>
              Submit Proof — Tile #{selectedTile.position}
            </div>
            <button className="btn-ghost" onClick={() => { setSelectedTile(null); setSubmitMsg(""); }}>Cancel</button>
          </div>
          {selectedTile.image_url && (
            <div className="modal-tile-image" style={{ marginBottom: 12 }}>
              <img src={selectedTile.image_url} alt="Tile" />
            </div>
          )}
          <p style={{ color: "var(--text-dim)", fontSize: "0.9rem", marginBottom: 12 }}>
            {selectedTile.task_description}
          </p>
          {isBattleship && (
            <p style={{ color: "var(--gold)", fontSize: "0.82rem", marginBottom: 12 }}>
              🎯 Completing this tile fires at position {selectedTile.position} on all enemy boards!
            </p>
          )}
          <form onSubmit={submitProof}>
            <ImageUpload
              value={proofUrl.startsWith("/api/") ? proofUrl : ""}
              onChange={(url) => setProofUrl(url)}
              label="Proof Image"
            />
            {proofUrl && !proofUrl.startsWith("/api/") && (
              <div className="form-group">
                <label>Or paste an image URL</label>
                <input type="text" value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="Paste a screenshot URL" />
              </div>
            )}
            {selectedTile.allow_early_submit && selectedTile.required_submissions > 1 && (
              <label className="toggle-label" style={{ marginBottom: 12 }}>
                <input type="checkbox" checked={earlySubmit} onChange={(e) => setEarlySubmit(e.target.checked)} style={{ width: "auto" }} />
                🏆 Submit as Early Completion (counts as full)
              </label>
            )}
            {submitMsg && <p className="success-msg">{submitMsg}</p>}
            <button type="submit" className="btn-primary" disabled={!proofUrl}>Submit Proof</button>
          </form>
        </div>
      )}

      <BingoBoard
        tiles={tiles}
        teams={teams}
        completedByTile={completedByTile}
        gridCols={gridCols}
        onTileClick={(tile) => { setSelectedTile(tile); setSubmitMsg(""); }}
        battleshipOverlays={overlays}
      />

      <div className="board-legend">
        {teams.map((t) => (
          <div key={t.id} className="legend-item">
            <span className="team-color-dot" style={{ width: 14, height: 14, background: t.color }} />
            {t.name}
            {isBattleship && shipState?.state?.[t.id]?.eliminated && " 💀"}
          </div>
        ))}
      </div>

      {/* Battleship ship status */}
      {isBattleship && myState && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-title">🚢 Your Fleet</div>
          {myState.ships.map((ship, i) => (
            <div key={i} className="bs-ship-row">
              <span className="bs-ship-icon">{ship.is_sunk ? "💀" : "🚢"}</span>
              <span style={{ flex: 1 }}>{ship.ship_name} ({ship.ship_size} tiles)</span>
              <span style={{ color: ship.is_sunk ? "var(--red)" : "var(--green)" }}>
                {ship.is_sunk ? "SUNK" : `${ship.hit_positions.length}/${ship.ship_size} hits`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Enemy status */}
      {isBattleship && shipState && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title">🎯 Enemy Fleet Status</div>
          {Object.values(shipState.state).filter((s) => s.team_id !== team.id).map((s) => (
            <div key={s.team_id} className="bs-ship-row" style={{ marginBottom: 8 }}>
              <span className="team-color-dot" style={{ width: 12, height: 12, background: s.team_color }} />
              <span style={{ flex: 1 }}>{s.team_name}</span>
              <span style={{ color: s.eliminated ? "var(--red)" : "var(--text-dim)" }}>
                {s.eliminated ? "ELIMINATED" : `${s.ships.filter((ship) => !ship.is_sunk).length}/${s.ships.length} ships left`}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-title">Your Submissions</div>
        {mySubmissions.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No submissions yet. Click a tile to submit proof!</p>
        ) : (
          mySubmissions.map((s) => (
            <div key={s.id} className="list-item" style={{ padding: "10px 14px" }}>
              <div className="list-item-info">
                <div className="list-item-name" style={{ fontSize: "0.9rem" }}>
                  Tile #{s.tile_position} — {s.task_description}
                </div>
                <div className="list-item-meta">
                  {new Date(s.created_at).toLocaleString()}
                  {s.is_early_completion && " · 🏆 Early completion"}
                </div>
              </div>
              {s.proof_url && (
                <a href={s.proof_url} target="_blank" rel="noopener" style={{ fontSize: "0.82rem" }}>View →</a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
