import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import BingoBoard from "../components/BingoBoard.jsx";
import TileModal from "../components/TileModal.jsx";
import { fillBoardTiles } from "../utils/board.js";

export default function GameBoard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [shipState, setShipState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTile, setSelectedTile] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [activity, setActivity] = useState([]);
  const [showActivity, setShowActivity] = useState(false);
  const [discordTeam, setDiscordTeam] = useState(null);
  const [discordMsg, setDiscordMsg] = useState("");
  const [discordImg, setDiscordImg] = useState("");
  const [discordResult, setDiscordResult] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api.getBoard(id);
      setBoard(data);
      if (data.game.game_type === "battleship") {
        const shipData = await api.getShipState(id);
        setShipState(shipData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 6000);
    return () => clearInterval(timer);
  }, [load]);

  async function openTile(tile) {
    setSelectedTile(tile);
    try {
      const data = await api.listGameSubmissions(id);
      const tileSubs = data.submissions.filter((s) => s.tile_id === tile.id);
      setSubmissions(tileSubs);
    } catch {
      setSubmissions([]);
    }
  }

  async function deleteSubmission(subId) {
    if (!confirm("Delete this submission? This reverts the tile completion.")) return;
    await api.deleteSubmission(subId);
    const data = await api.listGameSubmissions(id);
    const tileSubs = data.submissions.filter((s) => s.tile_id === selectedTile.id);
    setSubmissions(tileSubs);
    load();
  }

  async function updateTile(tileId, editData) {
    await api.updateTile(tileId, editData);
    load();
    if (selectedTile) {
      const data = await api.getBoard(id);
      const updatedTile = data.tiles.find((t) => t.id === tileId);
      if (updatedTile) setSelectedTile(updatedTile);
    }
  }

  async function moveTeam(teamId) {
    const pos = prompt("Move team to tile position:");
    if (pos === null) return;
    await api.moveTeam(id, teamId, parseInt(pos));
    load();
  }

  async function resetGame() {
    if (!confirm("Reset the entire game? All submissions, positions, and attacks will be cleared.")) return;
    await api.resetGame(id);
    load();
  }

  async function loadActivity() {
    const data = await api.getActivity(id);
    setActivity(data.activity || []);
    setShowActivity(true);
  }

  async function sendDiscord() {
    if (!discordTeam || !discordMsg) return;
    setDiscordResult("Sending…");
    try {
      const data = await api.postToDiscord(id, discordTeam, discordMsg, discordImg || undefined);
      setDiscordResult(data.success ? "✅ Sent to Discord!" : "❌ Failed to send");
    } catch (err) {
      setDiscordResult("❌ " + err.message);
    }
  }

  if (loading) return <div className="page"><p style={{ color: "var(--text-muted)" }}>Loading…</p></div>;
  if (error) return <div className="page"><p className="error-msg">{error}</p></div>;
  if (!board) return null;

  const { game, teams, completedByTile } = board;
  const config = typeof game.config === "string" ? JSON.parse(game.config) : game.config || {};
  const boardSize = config.boardSize || 5;
  const tiles = fillBoardTiles(board.tiles, boardSize);
  const gridCols = boardSize;
  const isBattleship = game.game_type === "battleship";

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <button className="btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 8 }}>← Back</button>
          <h1 className="page-title" style={{ marginBottom: 0 }}>{game.name}</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-secondary" onClick={() => navigate(`/games/${id}/setup`)}>⚙ Setup</button>
          <button className="btn-secondary" onClick={loadActivity}>📋 Activity</button>
          {game.status === "active" && (
            <button className="btn-danger" onClick={resetGame}>Reset Game</button>
          )}
        </div>
      </div>

      <p style={{ color: "var(--text-dim)", marginBottom: 16 }}>
        {game.event_name} · <span className={`badge badge-${game.status}`}>{game.status}</span>
        {" · Code: "}
        <span style={{ fontFamily: "monospace", color: "var(--gold)" }}>{game.join_code}</span>
        {isBattleship && " · 🚢 Battleship Bingo"}
      </p>

      {/* Winner banner */}
      {shipState?.winner && (
        <div className="card" style={{ textAlign: "center", borderColor: "var(--gold)", marginBottom: 16 }}>
          <div style={{ fontSize: "1.5rem" }}>🏆</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--gold)" }}>
            {shipState.winner.team_name} wins!
          </div>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{tiles.length}</div>
          <div className="stat-label">Tiles</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{teams.length}</div>
          <div className="stat-label">Teams</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Object.values(completedByTile).flat().length}</div>
          <div className="stat-label">Completions</div>
        </div>
        {isBattleship && (
          <div className="stat-card">
            <div className="stat-value">{shipState ? Object.values(shipState.state).filter((s) => !s.eliminated && s.ships_placed).length : 0}</div>
            <div className="stat-label">Active Fleets</div>
          </div>
        )}
      </div>

      <BingoBoard
        tiles={tiles}
        teams={teams}
        completedByTile={completedByTile}
        gridCols={gridCols}
        onTileClick={openTile}
        showRats={!isBattleship}
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

      {/* Battleship fleet status (admin) */}
      {isBattleship && shipState && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-title">🚢 Fleet Status</div>
          <div className="battleship-status">
            {Object.values(shipState.state).map((s) => (
              <div key={s.team_id} className={`bs-team-card ${s.eliminated ? "eliminated" : ""} ${shipState.winner?.team_id === s.team_id ? "winner" : ""}`}>
                <div className="bs-team-name">
                  <span className="team-color-dot" style={{ width: 14, height: 14, background: s.team_color }} />
                  {s.team_name}
                  {s.eliminated && <span style={{ color: "var(--red)", fontSize: "0.8rem" }}>💀 ELIMINATED</span>}
                  {shipState.winner?.team_id === s.team_id && <span style={{ color: "var(--gold)", fontSize: "0.8rem" }}>🏆 WINNER</span>}
                </div>
                {!s.ships_placed ? (
                  <div style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>Ships not placed yet</div>
                ) : (
                  s.ships.map((ship, i) => (
                    <div key={i} className="bs-ship-row">
                      <span className="bs-ship-icon">{ship.is_sunk ? "💀" : "🚢"}</span>
                      <span style={{ flex: 1 }}>{ship.ship_name}</span>
                      <span style={{ color: ship.is_sunk ? "var(--red)" : "var(--text-dim)", fontSize: "0.78rem" }}>
                        {ship.is_sunk ? "SUNK" : `${ship.hit_positions.length}/${ship.ship_size}`}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin team controls */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-title">Team Controls</div>
        {teams.map((t) => (
          <div key={t.id} className="list-item">
            <div className="list-item-info">
              <div className="list-item-name" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="team-color-dot" style={{ width: 16, height: 16, background: t.color }} />
                {t.name}
                {t.join_code && (
                  <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--gold)" }}>· {t.join_code}</span>
                )}
                {isBattleship && shipState?.state?.[t.id]?.ships_placed && (
                  <span style={{ fontSize: "0.75rem", color: "var(--green)" }}>🚢 Ships placed</span>
                )}
              </div>
              <div className="list-item-meta">
                Position: {t.position}
                {t.discord_webhook_url ? " · Discord linked" : ""}
              </div>
            </div>
            <div className="list-item-actions">
              <button className="btn-secondary" onClick={() => moveTeam(t.id)}>Move</button>
              <button className="btn-secondary" onClick={() => setDiscordTeam(discordTeam === t.id ? null : t.id)}>
                {discordTeam === t.id ? "Close" : "💬 Discord"}
              </button>
            </div>
          </div>
        ))}

        {discordTeam && (
          <div className="card" style={{ background: "var(--bg)", marginTop: 12, marginBottom: 0 }}>
            <div className="card-title" style={{ fontSize: "1rem" }}>Post to Discord</div>
            <div className="form-group">
              <label>Message</label>
              <textarea value={discordMsg} onChange={(e) => setDiscordMsg(e.target.value)} placeholder="Message to send to the team's Discord channel" />
            </div>
            <div className="form-group">
              <label>Image URL (optional)</label>
              <input type="text" value={discordImg} onChange={(e) => setDiscordImg(e.target.value)} placeholder="https://..." />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="btn-primary" onClick={sendDiscord} disabled={!discordMsg}>Send to Discord</button>
              {discordResult && <span style={{ fontSize: "0.85rem", color: discordResult.startsWith("✅") ? "var(--green)" : "var(--red)" }}>{discordResult}</span>}
            </div>
          </div>
        )}
      </div>

      {showActivity && (
        <div className="modal-overlay" onClick={() => setShowActivity(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <button className="modal-close" onClick={() => setShowActivity(false)}>✕</button>
            <div className="modal-title">Activity Log</div>
            {activity.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>No activity yet.</p>
            ) : (
              activity.map((a) => (
                <div key={a.id} className="list-item" style={{ padding: "8px 12px", marginBottom: 6 }}>
                  <div className="list-item-info">
                    <div className="list-item-name" style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}>
                      {a.team_color && <span className="team-color-dot" style={{ width: 10, height: 10, background: a.team_color }} />}
                      {a.team_name || "System"}
                      <span className={`badge badge-${a.event_type === "RESET" ? "setup" : "active"}`} style={{ fontSize: "0.65rem" }}>
                        {a.event_type}
                      </span>
                    </div>
                    <div className="list-item-meta" style={{ fontSize: "0.78rem" }}>
                      {a.details} · {new Date(a.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {selectedTile && (
        <TileModal
          tile={selectedTile}
          teams={teams}
          submissions={submissions}
          onClose={() => setSelectedTile(null)}
          onDeleteSubmission={deleteSubmission}
          onTileUpdate={updateTile}
          isAdmin={true}
        />
      )}
    </div>
  );
}
