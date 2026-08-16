import { useState } from "react";

const DEFAULT_SHIPS = {
  3: [{ name: "Destroyer", size: 2 }, { name: "Patrol", size: 2 }],
  4: [{ name: "Cruiser", size: 3 }, { name: "Destroyer", size: 2 }, { name: "Patrol", size: 2 }],
  5: [{ name: "Battleship", size: 4 }, { name: "Cruiser", size: 3 }, { name: "Destroyer", size: 2 }, { name: "Patrol", size: 2 }],
  6: [{ name: "Carrier", size: 5 }, { name: "Battleship", size: 4 }, { name: "Cruiser", size: 3 }, { name: "Submarine", size: 3 }, { name: "Destroyer", size: 2 }],
};

export default function GameSettings({ game, onSave }) {
  const config = typeof game.config === "string" ? JSON.parse(game.config) : game.config || {};
  const [boardSize, setBoardSize] = useState(config.boardSize || 5);
  const [gameType, setGameType] = useState(game.game_type || "bingo");
  const [ratsEnabled, setRatsEnabled] = useState(config.rats?.enabled ?? false);
  const [ratSelfProb, setRatSelfProb] = useState(config.rats?.selfProbability ?? 0.2);
  const [ships, setShips] = useState(config.ships || DEFAULT_SHIPS[config.boardSize || 5] || DEFAULT_SHIPS[5]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function addShip() {
    setShips([...ships, { name: `Ship ${ships.length + 1}`, size: 2 }]);
  }

  function removeShip(idx) {
    setShips(ships.filter((_, i) => i !== idx));
  }

  function updateShip(idx, field, value) {
    const updated = [...ships];
    updated[idx] = { ...updated[idx], [field]: field === "size" ? parseInt(value) : value };
    setShips(updated);
  }

  function onBoardSizeChange(size) {
    setBoardSize(parseInt(size));
    if (gameType === "battleship" && !config.ships) {
      setShips(DEFAULT_SHIPS[parseInt(size)] || DEFAULT_SHIPS[5]);
    }
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    const cfg = {
      ...config,
      boardSize: parseInt(boardSize),
      rats: { enabled: ratsEnabled, selfProbability: parseFloat(ratSelfProb) },
    };
    if (gameType === "battleship") {
      cfg.ships = ships;
    }
    await onSave({ game_type: gameType, config: cfg });
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
          <option value="battleship">🚢 Battleship Bingo</option>
          <option value="snakes_rats">Snakes & Rats (coming soon)</option>
        </select>
      </div>

      <div className="form-group">
        <label>Board Size (columns)</label>
        <select value={boardSize} onChange={(e) => onBoardSizeChange(e.target.value)}>
          <option value={3}>3 × 3 (9 tiles)</option>
          <option value={4}>4 × 4 (16 tiles)</option>
          <option value={5}>5 × 5 (25 tiles)</option>
          <option value={6}>6 × 6 (36 tiles)</option>
          <option value={7}>7 × 7 (49 tiles)</option>
          <option value={8}>8 × 8 (64 tiles)</option>
          <option value={10}>10 × 10 (100 tiles)</option>
        </select>
      </div>

      {gameType === "battleship" && (
        <div className="card" style={{ background: "var(--bg)", padding: "16px", marginBottom: 16, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <label style={{ margin: 0, fontWeight: 600 }}>🚢 Ships Configuration</label>
            <button className="btn-secondary" style={{ padding: "4px 12px", fontSize: "0.8rem" }} onClick={addShip}>+ Add Ship</button>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: 12 }}>
            Teams place these ships on their grid. Completing tiles attacks enemy positions.
          </p>
          {ships.map((ship, idx) => (
            <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label>Ship Name</label>
                <input type="text" value={ship.name} onChange={(e) => updateShip(idx, "name", e.target.value)} />
              </div>
              <div style={{ width: 80 }}>
                <label>Size</label>
                <input type="number" min="1" max={boardSize} value={ship.size} onChange={(e) => updateShip(idx, "size", e.target.value)} style={{ textAlign: "center" }} />
              </div>
              <button className="btn-danger" style={{ padding: "10px 12px" }} onClick={() => removeShip(idx)}>✕</button>
            </div>
          ))}
          <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: 8 }}>
            Total ship tiles: {ships.reduce((sum, s) => sum + s.size, 0)} / {boardSize * boardSize} grid tiles
          </p>
        </div>
      )}

      {gameType === "bingo" && (
        <div className="card" style={{ background: "var(--bg)", padding: "16px", marginBottom: 16, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={ratsEnabled} onChange={(e) => setRatsEnabled(e.target.checked)} style={{ width: "auto" }} />
              🐀 Enable Rats
            </label>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: 12 }}>
            Rats are hidden on tiles you mark. When a team completes a rat tile, a random team loses a completion.
          </p>
          {ratsEnabled && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Self-Rat Probability: {(ratSelfProb * 100).toFixed(0)}%</label>
              <input type="range" min="0" max="0.5" step="0.05" value={ratSelfProb} onChange={(e) => setRatSelfProb(parseFloat(e.target.value))} style={{ width: "100%" }} />
              <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: 4 }}>
                Chance the completing team hits themselves instead of another team.
              </p>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Settings"}
        </button>
        {saved && <span className="success-msg" style={{ marginTop: 0 }}>✅ Saved!</span>}
      </div>
    </div>
  );
}
