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
  const [shipState, setShipState] = useState(null);
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
      if (gameData.game.game_type === "battleship") {
        try {
          const shipData = await api.getShipState(id);
          setShipState(shipData);
        } catch {}
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  const config = game ? (typeof game.config === "string" ? JSON.parse(game.config) : game.config || {}) : {};
  const boardSize = config.boardSize || 5;
  const isBattleship = game?.game_type === "battleship";

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
      alert("Add at least one tile before starting.");
      return;
    }
    if (teams.length === 0) {
      alert("Add at least one team before starting.");
      return;
    }

    if (isBattleship && game.status === "setup") {
      await saveTiles(tiles);
      await api.updateGame(id, { status: "placing" });
      await load();
      return;
    }

    if (isBattleship && game.status === "placing") {
      if (shipState) {
        const allPlaced = teams.every((t) => shipState.state[t.id]?.ships_placed);
        if (!allPlaced) {
          alert("Not all teams have placed their ships yet!");
          return;
        }
      }
      await api.updateGame(id, { status: "active" });
      navigate(`/games/${id}/board`);
      return;
    }

    // Bingo
    await saveTiles(tiles);
    await api.updateGame(id, { status: "active" });
    navigate(`/games/${id}/board`);
  }

  if (loading) return <div className="page"><p style={{ color: "var(--text-muted)" }}>Loading…</p></div>;
  if (!game) return <div className="page"><p className="error-msg">Game not found</p></div>;

  const startButtonLabel = isBattleship
    ? game.status === "setup" ? "▶ Start Placement Phase"
    : game.status === "placing" ? "▶ Start Game"
    : "Go to Board"
    : "▶ Start Game";

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
        <TileEditor tiles={tiles} boardSize={boardSize} onChange={setTiles} onSave={saveTiles} />
      )}

      {tab === "teams" && (
        <>
          <TeamManager teams={teams} onCreate={createTeam} onUpdate={updateTeam} onDelete={deleteTeam} />
          {isBattleship && game.status === "placing" && shipState && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title">🚢 Ship Placement Status</div>
              {teams.map((t) => {
                const placed = shipState.state[t.id]?.ships_placed;
                return (
                  <div key={t.id} className="list-item">
                    <div className="list-item-info">
                      <div className="list-item-name" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="team-color-dot" style={{ width: 14, height: 14, background: t.color }} />
                        {t.name}
                      </div>
                      <div className="list-item-meta">
                        {placed ? "✅ Ships placed" : "⏳ Waiting for placement"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {(game.status === "setup" || (isBattleship && game.status === "placing")) && (
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <button className="btn-primary" style={{ fontSize: "1.1rem", padding: "14px 40px" }} onClick={startGame}>
            {startButtonLabel}
          </button>
          {isBattleship && game.status === "placing" && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: 8 }}>
              All teams must place their ships before starting.
            </p>
          )}
        </div>
      )}

      {game.status === "active" && (
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <button className="btn-primary" style={{ fontSize: "1.1rem", padding: "14px 40px" }} onClick={() => navigate(`/games/${id}/board`)}>
            Go to Board →
          </button>
        </div>
      )}
    </div>
  );
}
