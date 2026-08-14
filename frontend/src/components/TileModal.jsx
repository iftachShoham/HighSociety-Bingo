export default function TileModal({ tile, teams, submissions, onClose, onDeleteSubmission }) {
  const completedTeams = (submissions || []).reduce((acc, s) => {
    if (!acc.find((t) => t.id === s.team_id)) {
      const team = teams.find((t) => t.id === s.team_id);
      if (team) acc.push(team);
    }
    return acc;
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-title">Tile #{tile.position}</div>
        <p style={{ color: "var(--text-dim)", marginBottom: 16 }}>{tile.task_description || "No task description"}</p>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 20 }}>
          Required submissions: {tile.required_submissions}
        </p>

        <div className="card-title" style={{ fontSize: "1rem" }}>Submissions</div>
        {submissions.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No submissions yet.</p>
        ) : (
          submissions.map((s) => {
            const team = teams.find((t) => t.id === s.team_id);
            return (
              <div key={s.id} className="list-item" style={{ padding: "10px 14px" }}>
                <div className="list-item-info">
                  <div className="list-item-name" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.9rem" }}>
                    {team && <span className="team-color-dot" style={{ width: 12, height: 12, background: team.color }} />}
                    {team?.name || "Unknown"}
                    {s.is_early_completion && <span style={{ color: "var(--gold)" }}>🏆 Early</span>}
                  </div>
                  <div className="list-item-meta">
                    {s.submitted_by || "Unknown"} · {new Date(s.created_at).toLocaleString()}
                  </div>
                  {s.proof_url && (
                    <a href={s.proof_url} target="_blank" rel="noopener" style={{ fontSize: "0.82rem" }}>
                      View proof →
                    </a>
                  )}
                </div>
                <div className="list-item-actions">
                  <button className="btn-danger" style={{ padding: "6px 10px", fontSize: "0.8rem" }} onClick={() => onDeleteSubmission(s.id)}>
                    Revert
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
