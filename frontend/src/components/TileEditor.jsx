import { useState } from "react";
import ImageUpload from "./ImageUpload.jsx";

export default function TileEditor({ tiles, boardSize, onChange, onSave }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function addTile() {
    const nextPos = tiles.length > 0 ? Math.max(...tiles.map((t) => t.position)) + 1 : 1;
    onChange([...tiles, {
      position: nextPos,
      task_description: "",
      required_submissions: 1,
      metadata: {},
      image_url: "",
      is_rat_tile: false,
      allow_early_submit: false,
    }]);
  }

  function updateTile(idx, field, value) {
    const updated = [...tiles];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  }

  function removeTile(idx) {
    onChange(tiles.filter((_, i) => i !== idx));
  }

  function autoFill() {
    const total = boardSize * boardSize;
    const current = tiles.length;
    const newTiles = [...tiles];
    for (let i = current; i < total; i++) {
      newTiles.push({
        position: i + 1,
        task_description: "",
        required_submissions: 1,
        metadata: {},
        image_url: "",
        is_rat_tile: false,
        allow_early_submit: false,
      });
    }
    onChange(newTiles);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await onSave(tiles);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>Board Tiles</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-secondary" onClick={autoFill}>Auto-fill Grid</button>
          <button className="btn-secondary" onClick={addTile}>+ Add Tile</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save All"}
          </button>
        </div>
      </div>
      {saved && <p className="success-msg">✅ Tiles saved!</p>}
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 16 }}>
        {tiles.length} tile{tiles.length !== 1 ? "s" : ""} · Board: {boardSize}×{boardSize} = {boardSize * boardSize} tiles
      </p>

      {tiles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🗺️</div>
          <p>No tiles yet. Add tiles or auto-fill the grid.</p>
        </div>
      ) : (
        <div className="tile-editor-list">
          {tiles.map((tile, idx) => (
            <div key={idx} className="tile-editor-row">
              <div className="tile-editor-header">
                <span className="tile-editor-pos">#{tile.position}</span>
                <div className="tile-editor-toggles">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={tile.is_rat_tile || false}
                      onChange={(e) => updateTile(idx, "is_rat_tile", e.target.checked)}
                      style={{ width: "auto" }}
                    />
                    🐀 Rat
                  </label>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={tile.allow_early_submit || false}
                      onChange={(e) => updateTile(idx, "allow_early_submit", e.target.checked)}
                      style={{ width: "auto" }}
                    />
                    🏆 Early Submit
                  </label>
                </div>
                <button className="btn-danger" style={{ padding: "4px 10px", fontSize: "0.75rem" }} onClick={() => removeTile(idx)}>✕</button>
              </div>
              <div className="tile-editor-body">
                <div className="form-group">
                  <label>Tile Name / Task</label>
                  <input
                    type="text"
                    value={tile.task_description || ""}
                    onChange={(e) => updateTile(idx, "task_description", e.target.value)}
                    placeholder="e.g. Obtain an Abyssal Dagger"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group" style={{ flex: "0 0 80px" }}>
                    <label>Position</label>
                    <input
                      type="number"
                      value={tile.position}
                      onChange={(e) => updateTile(idx, "position", parseInt(e.target.value))}
                      style={{ textAlign: "center" }}
                    />
                  </div>
                  <div className="form-group" style={{ flex: "0 0 100px" }}>
                    <label>Required</label>
                    <input
                      type="number"
                      min="1"
                      value={tile.required_submissions}
                      onChange={(e) => updateTile(idx, "required_submissions", parseInt(e.target.value))}
                      style={{ textAlign: "center" }}
                    />
                  </div>
                </div>
                <ImageUpload
                  value={tile.image_url || ""}
                  onChange={(url) => updateTile(idx, "image_url", url)}
                  label="Tile Image (shown on board)"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
