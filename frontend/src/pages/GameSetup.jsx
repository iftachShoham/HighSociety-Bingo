import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";

export default function GameSetup() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [teams, setTeams] = useState([]);
  const [tiles, setTiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("tiles");

  // Team form
  const [teamName, setTeamName] = useState("");
  const [teamPassword, setTeamPassword] = useState("");

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

  async function addTeam(e) {
    e.preventDefault();
    try {
      await api.createTeam({
        game_id: parseInt(id),
        name: teamName,
        password: teamPassword || undefined,
      });
      setTeamName("");
      setTeamPassword("");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteTeam(teamId) {
    await api.deleteTeam(teamId);
    load();
  }

  async function saveTiles() {
    try {
      const data = await api.bulkUpdateTiles(id, tiles);
      setTiles(data.tiles);
      setError("");
      alert("Tiles saved!");
    } catch (err) {
      setError(err.message);
    }
  }

  function addTile() {
    const nextPos = tiles.length > 0 ? Math.max(...tiles.map((t) => t.position)) + 1 : 1;
    setTiles([...tiles, { position: nextPos, task_description: "", required_submissions: 1, metadata: {} }]);
  }

  function updateTile(idx, field, value) {
    const updated = [...tiles];
    updated[idx] = { ...updated[idx], [field]: value };
    setTiles(updated);
  }

  function removeTile(idx) {
    setTiles(tiles.filter((_, i) => i !== idx));
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
    await saveTiles();
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
        Type: {game.game_type} · Join Code: <span style={{ fontFamily: "monospace", color: "var(--gold)" }}>{game.join_code}</span>
      </p>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 24 }}>
        Players join at <a href={`/play/${game.join_code}`} target="_blank">/play/{game.join_code}</a>
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid var(--border)" }}>
        <button
          className="btn-ghost"
          style={{ borderBottom: tab === "tiles" ? "2px solid var(--gold)" : "2px solid transparent", borderRadius: 0, color: tab === "tiles" ? "var(--gold)" : "var(--text-dim)" }}
          onClick={() => setTab("tiles")}
        >
          🗺️ Tiles
        </button>
        <button
          className="btn-ghost"
          style={{ borderBottom: tab === "teams" ? "2px solid var(--gold)" : "2px solid transparent", borderRadius: 0, color: tab === "teams" ? "var(--gold)" : "var(--text-dim)" }}
          onClick={() => setTab("teams")}
        >
          🏆 Teams
        </button>
      </div>

      {error && <p className="error-msg" style={{ marginBottom: 16 }}>{error}</p>}

      {tab === "tiles" && (
        <>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Board Tiles</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-secondary" onClick={addTile}>+ Add Tile</button>
                <button className="btn-primary" onClick={saveTiles}>Save Tiles</button>
              </div>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 16 }}>
              Each tile has a task (e.g. an OSRS drop). Teams submit proof to complete tiles. First to clear the board wins.
            </p>
            {tiles.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🗺️</div>
                <p>No tiles yet. Add tiles to build your board.</p>
              </div>
            ) : (
              tiles.map((tile, idx) => (
                <div key={idx} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 50, flexShrink: 0 }}>
                    <label>Pos</label>
                    <input
                      type="number"
                      value={tile.position}
                      onChange={(e) => updateTile(idx, "position", parseInt(e.target.value))}
                      style={{ textAlign: "center" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Task Description</label>
                    <input
                      type="text"
                      value={tile.task_description || ""}
                      onChange={(e) => updateTile(idx, "task_description", e.target.value)}
                      placeholder="e.g. Obtain an Abyssal Dagger"
                    />
                  </div>
                  <div style={{ width: 90, flexShrink: 0 }}>
                    <label>Required</label>
                    <input
                      type="number"
                      min="1"
                      value={tile.required_submissions}
                      onChange={(e) => updateTile(idx, "required_submissions", parseInt(e.target.value))}
                      style={{ textAlign: "center" }}
                    />
                  </div>
                  <div style={{ width: 40, flexShrink: 0, paddingTop: 22 }}>
                    <button className="btn-danger" style={{ padding: "10px 12px" }} onClick={() => removeTile(idx)}>✕</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {tab === "teams" && (
        <>
          <div className="card">
            <div className="card-title">Add Team</div>
            <form onSubmit={addTeam}>
              <div className="form-row">
                <div className="form-group">
                  <label>Team Name</label>
                  <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Purple Team" required />
                </div>
                <div className="form-group">
                  <label>Password (optional)</label>
                  <input type="text" value={teamPassword} onChange={(e) => setTeamPassword(e.target.value)} placeholder="Protect team access" />
                </div>
              </div>
              <button type="submit" className="btn-primary">Add Team</button>
            </form>
          </div>

          {teams.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏆</div>
              <p>No teams yet. Add teams to participate in this game.</p>
            </div>
          ) : (
            teams.map((t) => (
              <div key={t.id} className="list-item">
                <div className="list-item-info">
                  <div className="list-item-name" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="team-color-dot" style={{ width: 16, height: 16, background: t.color }} />
                    {t.name}
                  </div>
                  <div className="list-item-meta">
                    {t.password_hash ? "🔒 Password protected" : "No password"}
                    {t.discord_channel_id ? " · Discord linked" : ""}
                  </div>
                </div>
                <div className="list-item-actions">
                  <button className="btn-danger" onClick={() => deleteTeam(t.id)}>Delete</button>
                </div>
              </div>
            ))
          )}
        </>
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
