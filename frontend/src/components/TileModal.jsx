import { useState } from "react";
import { api } from "../api/client.js";
import ImageUpload from "./ImageUpload.jsx";

export default function TileModal({ tile, teams, submissions, onClose, onDeleteSubmission, onTileUpdate, isAdmin }) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    task_description: tile.task_description || "",
    required_submissions: tile.required_submissions,
    image_url: tile.image_url || "",
    is_rat_tile: tile.is_rat_tile || false,
    allow_early_submit: tile.allow_early_submit || false,
  });
  const [saving, setSaving] = useState(false);

  async function saveTile() {
    setSaving(true);
    try {
      await onTileUpdate(tile.id, editData);
      setEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        {editing ? (
          <>
            <div className="modal-title">Edit Tile #{tile.position}</div>
            <div className="form-group">
              <label>Tile Name / Task</label>
              <input
                type="text"
                value={editData.task_description}
                onChange={(e) => setEditData({ ...editData, task_description: e.target.value })}
                placeholder="e.g. Obtain an Abyssal Dagger"
              />
            </div>
            <div className="form-group">
              <label>Required Submissions</label>
              <input
                type="number"
                min="1"
                value={editData.required_submissions}
                onChange={(e) => setEditData({ ...editData, required_submissions: parseInt(e.target.value) })}
              />
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={editData.is_rat_tile}
                  onChange={(e) => setEditData({ ...editData, is_rat_tile: e.target.checked })}
                  style={{ width: "auto" }}
                />
                🐀 Rat Tile
              </label>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={editData.allow_early_submit}
                  onChange={(e) => setEditData({ ...editData, allow_early_submit: e.target.checked })}
                  style={{ width: "auto" }}
                />
                🏆 Allow Early Submit
              </label>
            </div>
            <ImageUpload
              value={editData.image_url}
              onChange={(url) => setEditData({ ...editData, image_url: url })}
              label="Tile Image"
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn-primary" onClick={saveTile} disabled={saving}>
                {saving ? "Saving…" : "Save Tile"}
              </button>
              <button className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-title">
              Tile #{tile.position}
              {tile.is_rat_tile && <span className="rat-indicator" style={{ marginLeft: 8 }}>🐀 Rat Tile</span>}
              {tile.allow_early_submit && <span className="early-indicator" style={{ marginLeft: 8 }}>🏆 Early OK</span>}
            </div>

            {tile.image_url && (
              <div className="modal-tile-image">
                <img src={tile.image_url} alt="Tile" />
              </div>
            )}

            <p style={{ color: "var(--text-dim)", marginBottom: 8 }}>{tile.task_description || "No task description"}</p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 20 }}>
              Required submissions: {tile.required_submissions}
            </p>

            {isAdmin && (
              <button className="btn-secondary" style={{ marginBottom: 16 }} onClick={() => setEditing(true)}>
                ✏ Edit Tile
              </button>
            )}

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
                    {isAdmin && (
                      <div className="list-item-actions">
                        <button className="btn-danger" style={{ padding: "6px 10px", fontSize: "0.8rem" }} onClick={() => onDeleteSubmission(s.id)}>
                          Revert
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}
