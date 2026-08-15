import { useState } from "react";

const TEAM_COLORS = [
  "#9b59b6", "#e74c3c", "#3498db", "#f1c40f",
  "#2ecc71", "#e67e22", "#1abc9c", "#ff6b9d",
  "#95a5a6", "#e91e63", "#00bcd4", "#8bc34a",
];

export default function TeamManager({ teams, onCreate, onUpdate, onDelete }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newColor, setNewColor] = useState(TEAM_COLORS[0]);
  const [newWebhook, setNewWebhook] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  async function addTeam(e) {
    e.preventDefault();
    await onCreate({
      name: newName,
      color: newColor,
      password: newPassword || undefined,
      discord_webhook_url: newWebhook || undefined,
    });
    setNewName("");
    setNewPassword("");
    setNewWebhook("");
    setShowAdd(false);
  }

  function startEdit(team) {
    setEditingId(team.id);
    setEditData({
      name: team.name,
      color: team.color,
      discord_channel_id: team.discord_channel_id || "",
      discord_webhook_url: team.discord_webhook_url || "",
      position: team.position,
      password: "",
    });
  }

  async function saveEdit(teamId) {
    const updates = { ...editData };
    if (!updates.password) delete updates.password;
    await onUpdate(teamId, updates);
    setEditingId(null);
  }

  function copyCode(code) {
    navigator.clipboard.writeText(code);
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>Teams ({teams.length})</div>
        <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? "Cancel" : "+ Add Team"}
        </button>
      </div>

      {showAdd && (
        <div className="card">
          <div className="card-title">New Team</div>
          <form onSubmit={addTeam}>
            <div className="form-row">
              <div className="form-group">
                <label>Team Name</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Purple Team" required />
              </div>
              <div className="form-group">
                <label>Color</label>
                <div className="color-picker">
                  {TEAM_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`color-swatch ${newColor === c ? "selected" : ""}`}
                      style={{ background: c }}
                      onClick={() => setNewColor(c)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Password (optional)</label>
                <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Protect team access" />
              </div>
              <div className="form-group">
                <label>Discord Webhook URL (optional)</label>
                <input type="text" value={newWebhook} onChange={(e) => setNewWebhook(e.target.value)} placeholder="https://discord.com/api/webhooks/..." />
              </div>
            </div>
            <button type="submit" className="btn-primary">Create Team</button>
          </form>
        </div>
      )}

      {teams.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏆</div>
          <p>No teams yet. Add teams to participate in this game.</p>
        </div>
      ) : (
        teams.map((t) => (
          <div key={t.id} className="card team-card">
            {editingId === t.id ? (
              <div>
                <div className="card-title">Edit: {t.name}</div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Team Name</label>
                    <input type="text" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Color</label>
                    <div className="color-picker">
                      {TEAM_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`color-swatch ${editData.color === c ? "selected" : ""}`}
                          style={{ background: c }}
                          onClick={() => setEditData({ ...editData, color: c })}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label>Discord Webhook URL</label>
                  <input type="text" value={editData.discord_webhook_url} onChange={(e) => setEditData({ ...editData, discord_webhook_url: e.target.value })} placeholder="https://discord.com/api/webhooks/..." />
                </div>
                <div className="form-group">
                  <label>Discord Channel ID</label>
                  <input type="text" value={editData.discord_channel_id} onChange={(e) => setEditData({ ...editData, discord_channel_id: e.target.value })} placeholder="Channel ID" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Position</label>
                    <input type="number" value={editData.position} onChange={(e) => setEditData({ ...editData, position: parseInt(e.target.value) })} />
                  </div>
                  <div className="form-group">
                    <label>New Password (leave blank to keep)</label>
                    <input type="text" value={editData.password} onChange={(e) => setEditData({ ...editData, password: e.target.value })} placeholder="Enter to change" />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-primary" onClick={() => saveEdit(t.id)}>Save</button>
                  <button className="btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div className="list-item-name" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span className="team-color-dot" style={{ width: 18, height: 18, background: t.color }} />
                      {t.name}
                    </div>
                    <div className="list-item-meta">
                      Position: {t.position}
                      {" · "}
                      {t.password_hash ? "🔒 Password protected" : "No password"}
                      {t.discord_webhook_url ? " · Discord linked" : ""}
                    </div>
                  </div>
                  <div className="list-item-actions">
                    <button className="btn-secondary" onClick={() => startEdit(t)}>Edit</button>
                    <button className="btn-danger" onClick={() => onDelete(t.id)}>Delete</button>
                  </div>
                </div>
                {t.join_code && (
                  <div className="team-join-code">
                    <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>Team Join Code:</span>
                    <code style={{ fontFamily: "monospace", color: "var(--gold)", fontSize: "0.9rem" }}>{t.join_code}</code>
                    <button className="btn-ghost" style={{ padding: "3px 10px", fontSize: "0.75rem" }} onClick={() => copyCode(t.join_code)}>Copy</button>
                    <a href={`/play/${t.join_code}`} target="_blank" style={{ fontSize: "0.78rem" }}>Open →</a>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </>
  );
}
