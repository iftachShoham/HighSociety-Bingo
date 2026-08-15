import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";

export default function TeamLogin() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [teamByCode, setTeamByCode] = useState(null);
  const [boardTeams, setBoardTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    (async () => {
      // First check if this is a team join code
      try {
        const teamData = await api.getTeamByCode(code);
        setTeamByCode(teamData.team);
        // Also get the game info
        const gameData = await api.getGameByCode(teamData.team.game_join_code);
        setGame(gameData.game);
        const boardData = await api.getBoard(teamData.team.game_id);
        setBoardTeams(boardData.teams);
        setLoading(false);
        return;
      } catch {
        // Not a team code, try as game code
      }

      try {
        const gameData = await api.getGameByCode(code);
        setGame(gameData.game);
        const boardData = await api.getBoard(gameData.game.id);
        setBoardTeams(boardData.teams);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    try {
      const data = await api.teamLogin(game.id, selectedTeam, password);
      navigate(`/play/${code}/team/${data.team.id}`);
    } catch (err) {
      setLoginError(err.message);
    }
  }

  async function handleTeamCodeLogin(e) {
    e.preventDefault();
    setLoginError("");
    try {
      const data = await api.teamLoginByCode(teamByCode.join_code, password);
      navigate(`/play/${teamByCode.game_join_code}/team/${data.team.id}`);
    } catch (err) {
      setLoginError(err.message);
    }
  }

  if (loading) return <div className="page"><p style={{ color: "var(--text-muted)" }}>Loading…</p></div>;
  if (error) return <div className="page"><p className="error-msg">{error}</p></div>;

  // Direct team access via team join code
  if (teamByCode) {
    return (
      <div className="page" style={{ maxWidth: 440, paddingTop: 60 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>🐀</div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>{teamByCode.game_name}</h1>
          <p style={{ color: "var(--text-dim)" }}>{teamByCode.event_name}</p>
          <div style={{ marginTop: 12 }}>
            <span className="team-color-dot" style={{ width: 20, height: 20, background: teamByCode.color, display: "inline-block" }} />
            <span style={{ marginLeft: 8, fontWeight: 600 }}>{teamByCode.name}</span>
          </div>
          {teamByCode.game_status !== "active" && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 8 }}>
              This game hasn't started yet.
            </p>
          )}
        </div>

        <div className="card">
          <div className="card-title">Enter Your Team</div>
          <form onSubmit={handleTeamCodeLogin}>
            <div className="form-group">
              <label>Password (if required)</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Team password" />
            </div>
            {loginError && <p className="error-msg">{loginError}</p>}
            <button type="submit" className="btn-primary" style={{ width: "100%" }}>Enter Game</button>
          </form>
        </div>
      </div>
    );
  }

  // Game code — show team selection
  return (
    <div className="page" style={{ maxWidth: 440, paddingTop: 60 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>🐀</div>
        <h1 className="page-title" style={{ marginBottom: 4 }}>{game?.name}</h1>
        <p style={{ color: "var(--text-dim)" }}>{game?.event_name}</p>
        {game?.status !== "active" && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 8 }}>
            This game hasn't started yet.
          </p>
        )}
      </div>

      <div className="card">
        <div className="card-title">Join Your Team</div>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Select Your Team</label>
            <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} required>
              <option value="">Choose your team…</option>
              {boardTeams.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Password (if required)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Team password" />
          </div>
          {loginError && <p className="error-msg">{loginError}</p>}
          <button type="submit" className="btn-primary" style={{ width: "100%" }}>Enter Game</button>
        </form>
      </div>
    </div>
  );
}
