import { useState } from "react";

export default function GameSettings({ game, onSave }) {
  const config = typeof game.config === "string" ? JSON.parse(game.config) : game.config || {};
  const [boardSize, setBoardSize] = useState(config.boardSize || 5);
  const [gameType, setGameType] = useState(game.game_type || "bingo");
  const [ratsEnabled, setRatsEnabled] = useState(config.rats?.enabled ?? false);
  const [ratSelfProb, setRatSelfProb] = useState(config.rats?.selfProbability ?? 0.2);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    await onSave({
      game_type: gameType,
      config: {
        ...config,
        boardSize: parseInt(boardSize),
        rats: {
          enabled: ratsEnabled,
          selfProbability: parseFloat(ratSelfProb),
        },
      },
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="card">
      <div className="card-title">Game Settings</div>

      <div className="form-group">
        <label>Game Type</label>
        <select value={gameType} onChange={(e) => setGameType(e.target.value)}>
          <option value="bingo">Bingo Board</option>
          <option value="battleship">Battleship Bingo (coming soon)</option>
          <option value="snakes_rats">Snakes & Rats (coming soon)</option>
        </select>
      </div>

      <div className="form-group">
        <label>Board Size (columns)</label>
        <select value={boardSize} onChange={(e) => setBoardSize(e.target.value)}>
          <option value={3}>3 × 3 (9 tiles)</option>
          <option value={4}>4 × 4 (16 tiles)</option>
          <option value={5}>5 × 5 (25 tiles)</option>
          <option value={6}>6 × 6 (36 tiles)</option>
          <option value={7}>7 × 7 (49 tiles)</option>
          <option value={8}>8 × 8 (64 tiles)</option>
          <option value={10}>10 × 10 (100 tiles)</option>
        </select>
      </div>

      <div className="card" style={{ background: "var(--bg)", padding: "16px", marginBottom: 16, border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={ratsEnabled}
              onChange={(e) => setRatsEnabled(e.target.checked)}
              style={{ width: "auto" }}
            />
            🐀 Enable Rats
          </label>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: 12 }}>
          Rats are hidden on tiles you mark. When a team completes a rat tile, a random team loses a completion.
        </p>
        {ratsEnabled && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Self-Rat Probability: {(ratSelfProb * 100).toFixed(0)}%</label>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.05"
              value={ratSelfProb}
              onChange={(e) => setRatSelfProb(parseFloat(e.target.value))}
              style={{ width: "100%" }}
            />
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: 4 }}>
              Chance the completing team hits themselves instead of another team.
            </p>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Settings"}
        </button>
        {saved && <span className="success-msg" style={{ marginTop: 0 }}>✅ Saved!</span>}
      </div>
    </div>
  );
}
