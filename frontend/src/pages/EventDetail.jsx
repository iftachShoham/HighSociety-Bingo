import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("bingo");
  const [error, setError] = useState("");

  async function load() {
    try {
      const [evData, gameData] = await Promise.all([
        api.getEvent(id),
        api.listGames(id),
      ]);
      setEvent(evData.event);
      setGames(gameData.games || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function createGame(e) {
    e.preventDefault();
    setError("");
    try {
      const config = newType === "bingo"
        ? { boardSize: 5, winCondition: "full" }
        : {};
      const data = await api.createGame(parseInt(id), newName, newType, config);
      setShowCreate(false);
      setNewName("");
      navigate(`/games/${data.game.id}/setup`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteGame(gameId) {
    if (!confirm("Delete this game and all its data?")) return;
    await api.deleteGame(gameId);
    load();
  }

  const gameTypes = [
    { value: "bingo", label: "Bingo Board" },
    { value: "battleship", label: "Battleship Bingo (coming soon)" },
    { value: "snakes_rats", label: "Snakes & Rats (coming soon)" },
  ];

  return (
    <div className="page">
      <button className="btn-ghost" onClick={() => navigate("/dashboard")} style={{ marginBottom: 16 }}>
        ← Back to Dashboard
      </button>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : event ? (
        <>
          <h1 className="page-title">{event.name}</h1>
          {event.description && <p style={{ color: "var(--text-dim)", marginBottom: 24 }}>{event.description}</p>}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ fontSize: "1.3rem" }}>Games</h2>
            <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
              {showCreate ? "Cancel" : "+ New Game"}
            </button>
          </div>

          {showCreate && (
            <div className="card">
              <div className="card-title">Create Game</div>
              <form onSubmit={createGame}>
                <div className="form-group">
                  <label>Game Name</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Bingo Round 1" required />
                </div>
                <div className="form-group">
                  <label>Game Type</label>
                  <select value={newType} onChange={(e) => setNewType(e.target.value)}>
                    {gameTypes.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                {error && <p className="error-msg">{error}</p>}
                <button type="submit" className="btn-primary">Create Game</button>
              </form>
            </div>
          )}

          {games.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎮</div>
              <p>No games yet. Create one to get started!</p>
            </div>
          ) : (
            games.map((g) => (
              <div key={g.id} className="list-item">
                <div className="list-item-info" style={{ cursor: "pointer" }} onClick={() => navigate(`/games/${g.id}/board`)}>
                  <div className="list-item-name">{g.name}</div>
                  <div className="list-item-meta">
                    <span className={`badge badge-${g.status}`}>{g.status}</span>
                    {" · "}
                    {g.game_type} · {g.team_count} team{g.team_count !== 1 ? "s" : ""}
                    {" · Code: "}
                    <span style={{ fontFamily: "monospace", color: "var(--gold)" }}>{g.join_code}</span>
                  </div>
                </div>
                <div className="list-item-actions">
                  <button className="btn-secondary" onClick={() => navigate(`/games/${g.id}/setup`)}>Setup</button>
                  <button className="btn-secondary" onClick={() => navigate(`/games/${g.id}/board`)}>Board</button>
                  <button className="btn-danger" onClick={() => deleteGame(g.id)}>Delete</button>
                </div>
              </div>
            ))
          )}
        </>
      ) : (
        <p className="error-msg">Event not found</p>
      )}
    </div>
  );
}
