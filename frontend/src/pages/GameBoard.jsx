import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import BingoBoard from "../components/BingoBoard.jsx";
import TileModal from "../components/TileModal.jsx";

export default function GameBoard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTile, setSelectedTile] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  const load = useCallback(async () => {
    try {
      const data = await api.getBoard(id);
      setBoard(data);
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

  async function moveTeam(teamId, position) {
    const pos = prompt("Move team to tile position:");
    if (pos === null) return;
    await api.moveTeam(id, teamId, parseInt(pos));
    load();
  }

  async function resetGame() {
    if (!confirm("Reset the entire game? All submissions and positions will be cleared.")) return;
    await api.resetGame(id);
    load();
  }

  if (loading) return <div className="page"><p style={{ color: "var(--text-muted)" }}>Loading…</p></div>;
  if (error) return <div className="page"><p className="error-msg">{error}</p></div>;
  if (!board) return null;

  const { game, tiles, teams, completedByTile } = board;
  const config = typeof game.config === "string" ? JSON.parse(game.config) : game.config;
  const boardSize = config?.boardSize || 5;
  const gridCols = Math.min(tiles.length, boardSize);

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <button className="btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 8 }}>← Back</button>
          <h1 className="page-title" style={{ marginBottom: 0 }}>{game.name}</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-secondary" onClick={() => navigate(`/games/${id}/setup`)}>⚙ Setup</button>
          {game.status === "active" && (
            <button className="btn-danger" onClick={resetGame}>Reset Game</button>
          )}
        </div>
      </div>

      <p style={{ color: "var(--text-dim)", marginBottom: 16 }}>
        {game.event_name} · <span className={`badge badge-${game.status}`}>{game.status}</span>
        {" · Code: "}
        <span style={{ fontFamily: "monospace", color: "var(--gold)" }}>{game.join_code}</span>
      </p>

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
          <div className="stat-value">
            {Object.values(completedByTile).flat().length}
          </div>
          <div className="stat-label">Completions</div>
        </div>
      </div>

      <BingoBoard
        tiles={tiles}
        teams={teams}
        completedByTile={completedByTile}
        gridCols={gridCols}
        onTileClick={openTile}
      />

      <div className="board-legend">
        {teams.map((t) => (
          <div key={t.id} className="legend-item">
            <span className="team-color-dot" style={{ width: 14, height: 14, background: t.color }} />
            {t.name}
          </div>
        ))}
      </div>

      {/* Admin team controls */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-title">Team Controls</div>
        {teams.map((t) => (
          <div key={t.id} className="list-item">
            <div className="list-item-info">
              <div className="list-item-name" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="team-color-dot" style={{ width: 16, height: 16, background: t.color }} />
                {t.name}
              </div>
              <div className="list-item-meta">Position: {t.position}</div>
            </div>
            <div className="list-item-actions">
              <button className="btn-secondary" onClick={() => moveTeam(t.id, t.position)}>Move</button>
            </div>
          </div>
        ))}
      </div>

      {selectedTile && (
        <TileModal
          tile={selectedTile}
          teams={teams}
          submissions={submissions}
          onClose={() => setSelectedTile(null)}
          onDeleteSubmission={deleteSubmission}
        />
      )}
    </div>
  );
}
