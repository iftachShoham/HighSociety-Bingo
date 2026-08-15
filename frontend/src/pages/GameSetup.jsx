import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import GameSettings from "../components/GameSettings.jsx";
import TileEditor from "../components/TileEditor.jsx";
import TeamManager from "../components/TeamManager.jsx";

export default function GameSetup() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [teams, setTeams] = useState([]);
  const [tiles, setTiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("settings");

  async function load() {
    try {
      const [gameData, teamData, tileData] = await Promise.all([
        api.getGame(id),
        api.listTeams(id),
        api.listTiles(id),
      ]);
      setGame(gameData.game);
      setTeams(teamData.teams || []);
      setTiles(tileData.tiles || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  const config = game ? (typeof game.config === "string" ? JSON.parse(game.config) : game.config || {}) : {};
  const boardSize = config.boardSize || 5;

  async function saveSettings(updates) {
    try {
      const data = await api.updateGame(id, updates);
      setGame(data.game);
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveTiles(updatedTiles) {
    const data = await api.bulkUpdateTiles(id, updatedTiles);
    setTiles(data.tiles);
  }

  async function createTeam(teamData) {
    await api.createTeam({ game_id: parseInt(id), ...teamData });
    const data = await api.listTeams(id);
    setTeams(data.teams || []);
  }

  async function updateTeam(teamId, updates) {
    await api.updateTeam(teamId, updates);
    const data = await api.listTeams(id);
    setTeams(data.teams || []);
  }

  async function deleteTeam(teamId) {
    await api.deleteTeam(teamId);
    const data = await api.listTeams(id);
    setTeams(data.teams || []);
  }

  async function startGame() {
    if (tiles.length === 0) {
      alert("Add at least one tile before starting the game.");
      return;
    }
    if (teams.length === 0) {
      alert("Add at least one team before starting the game.");
      return;
    }
    await saveTiles(tiles);
    await api.updateGame(id, { status: "active" });
    navigate(`/games/${id}/board`);
  }

  if (loading) return <div className="page"><p style={{ color: "var(--text-muted)" }}>Loading…</p></div>;
  if (!game) return <div className="page"><p className="error-msg">Game not found</p></div>;

  return (
    <div className="page">
      <button className="btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>← Back</button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>{game.name}</h1>
        <span className={`badge badge-${game.status}`}>{game.status}</span>
      </div>
      <p style={{ color: "var(--text-dim)", marginBottom: 8 }}>
        Type: {game.game_type} · Game Code: <span style={{ fontFamily: "monospace", color: "var(--gold)" }}>{game.join_code}</span>
      </p>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 24 }}>
        Players join at <a href={`/play/${game.join_code}`} target="_blank">/play/{game.join_code}</a>
      </p>

      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--border)" }}>
        {[
          { key: "settings", label: "⚙ Settings" },
          { key: "tiles", label: "🗺️ Tiles" },
          { key: "teams", label: "🏆 Teams" },
        ].map((t) => (
          <button
            key={t.key}
            className="btn-ghost"
            style={{
              borderBottom: tab === t.key ? "2px solid var(--gold)" : "2px solid transparent",
              borderRadius: 0,
              color: tab === t.key ? "var(--gold)" : "var(--text-dim)",
            }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="error-msg" style={{ marginBottom: 16 }}>{error}</p>}

      {tab === "settings" && <GameSettings game={game} onSave={saveSettings} />}

      {tab === "tiles" && (
        <TileEditor
          tiles={tiles}
          boardSize={boardSize}
          onChange={setTiles}
          onSave={saveTiles}
        />
      )}

      {tab === "teams" && (
        <TeamManager
          teams={teams}
          onCreate={createTeam}
          onUpdate={updateTeam}
          onDelete={deleteTeam}
        />
      )}

      {game.status === "setup" && (
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <button className="btn-primary" style={{ fontSize: "1.1rem", padding: "14px 40px" }} onClick={startGame}>
            ▶ Start Game
          </button>
        </div>
      )}
    </div>
  );
}
