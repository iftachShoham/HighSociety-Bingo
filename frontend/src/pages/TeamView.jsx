import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import BingoBoard from "../components/BingoBoard.jsx";
import ImageUpload from "../components/ImageUpload.jsx";

export default function TeamView() {
  const { code, teamId } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [team, setTeam] = useState(null);
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
          msg += data.rat_result.self_rat
            ? ` 🐀 You triggered a rat on yourself!`
            : ` 🐀 Rat triggered! ${data.rat_result.victim_name} lost a completion.`;
        }
        setSubmitMsg(msg);
        setProofUrl("");
        setEarlySubmit(false);
        const subData = await api.listTeamSubmissions(teamId);
        setMySubmissions(subData.submissions || []);
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

      {game.status !== "active" && (
        <div className="card" style={{ textAlign: "center", color: "var(--text-muted)" }}>
          This game hasn't started yet. Check back soon!
        </div>
      )}

      {game.status === "active" && (
        <>
          {selectedTile && (
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
              <form onSubmit={submitProof}>
                <ImageUpload
                  value={proofUrl.startsWith("/api/") ? proofUrl : ""}
                  onChange={(url) => setProofUrl(url)}
                  label="Proof Image"
                />
                {proofUrl && !proofUrl.startsWith("/api/") && (
                  <div className="form-group">
                    <label>Or paste an image URL</label>
                    <input
                      type="text"
                      value={proofUrl}
                      onChange={(e) => setProofUrl(e.target.value)}
                      placeholder="Paste a screenshot URL"
                    />
                  </div>
                )}
                {selectedTile.allow_early_submit && selectedTile.required_submissions > 1 && (
                  <label className="toggle-label" style={{ marginBottom: 12 }}>
                    <input
                      type="checkbox"
                      checked={earlySubmit}
                      onChange={(e) => setEarlySubmit(e.target.checked)}
                      style={{ width: "auto" }}
                    />
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
          />

          <div className="board-legend">
            {teams.map((t) => (
              <div key={t.id} className="legend-item">
                <span className="team-color-dot" style={{ width: 14, height: 14, background: t.color }} />
                {t.name}
              </div>
            ))}
          </div>

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
                    <a href={s.proof_url} target="_blank" rel="noopener" style={{ fontSize: "0.82rem" }}>
                      View →
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
