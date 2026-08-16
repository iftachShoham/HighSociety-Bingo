import { useState, useEffect } from "react";
import { api } from "../api/client.js";

export default function ShipPlacement({ gameId, teamId, teamColor, boardSize, configShips, onPlaced }) {
  const [ships, setShips] = useState([]);
  const [placed, setPlaced] = useState({}); // { [shipIndex]: [positions] }
  const [selectedShip, setSelectedShip] = useState(null);
  const [orientation, setOrientation] = useState("horizontal");
  const [hoverPos, setHoverPos] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [alreadyPlaced, setAlreadyPlaced] = useState(false);

  useEffect(() => {
    const defaultShips = (configShips && configShips.length > 0 ? configShips : [
      { name: "Battleship", size: 4 },
      { name: "Cruiser", size: 3 },
      { name: "Destroyer", size: 2 },
      { name: "Patrol", size: 2 },
    ]).map((s, i) => ({ ...s, index: i }));
    setShips(defaultShips);

    // Check if already placed
    api.getTeamShips(teamId).then((data) => {
      if (data.ships && data.ships.length > 0) {
        const p = {};
        data.ships.forEach((s, i) => { p[i] = s.positions; });
        setPlaced(p);
        setAlreadyPlaced(true);
      }
    }).catch(() => {});
  }, [teamId, configShips]);

  const allPlaced = ships.length > 0 && ships.every((_, i) => placed[i]);

  function getPreviewPositions(startPos) {
    if (selectedShip === null || !startPos) return [];
    const ship = ships[selectedShip];
    const positions = [];
    for (let i = 0; i < ship.size; i++) {
      if (orientation === "horizontal") {
        positions.push(startPos + i);
      } else {
        positions.push(startPos + i * boardSize);
      }
    }
    // Check validity
    const row = Math.floor((startPos - 1) / boardSize);
    const valid = positions.every((p) => {
      if (p < 1 || p > boardSize * boardSize) return false;
      if (orientation === "horizontal" && Math.floor((p - 1) / boardSize) !== row) return false;
      // Check no overlap with other placed ships
      for (const [idx, pos] of Object.entries(placed)) {
        if (parseInt(idx) !== selectedShip && pos.includes(p)) return false;
      }
      return true;
    });
    return valid ? positions : [];
  }

  function placeShip(startPos) {
    if (selectedShip === null) return;
    const positions = getPreviewPositions(startPos);
    if (positions.length === 0) {
      setError("Invalid placement — ship doesn't fit or overlaps another ship.");
      return;
    }
    setError("");
    setPlaced({ ...placed, [selectedShip]: positions });
    setSelectedShip(null);
    setHoverPos(null);
  }

  function removeShip(idx) {
    const newPlaced = { ...placed };
    delete newPlaced[idx];
    setPlaced(newPlaced);
    setAlreadyPlaced(false);
  }

  async function confirm() {
    setSaving(true);
    setError("");
    try {
      const shipData = ships.map((s, i) => ({
        name: s.name,
        size: s.size,
        positions: placed[i] || [],
      }));
      await api.placeShips(teamId, shipData);
      setAlreadyPlaced(true);
      if (onPlaced) onPlaced();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const occupiedPositions = new Set();
  Object.entries(placed).forEach(([idx, positions]) => {
    positions.forEach((p) => occupiedPositions.add(p));
  });

  const previewPositions = hoverPos && selectedShip !== null ? new Set(getPreviewPositions(hoverPos)) : new Set();

  return (
    <div className="card">
      <div className="card-title">🚢 Place Your Ships</div>
      {alreadyPlaced && (
        <p className="success-msg" style={{ marginBottom: 12 }}>
          ✅ Ships placed! You can rearrange them or confirm to lock in.
        </p>
      )}
      {error && <p className="error-msg" style={{ marginBottom: 12 }}>{error}</p>}

      {/* Orientation toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <span style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>Orientation:</span>
        <button
          className={`btn-secondary ${orientation === "horizontal" ? "btn-primary" : ""}`}
          style={{ padding: "6px 14px", fontSize: "0.85rem" }}
          onClick={() => setOrientation("horizontal")}
        >
          ➡️ Horizontal
        </button>
        <button
          className={`btn-secondary ${orientation === "vertical" ? "btn-primary" : ""}`}
          style={{ padding: "6px 14px", fontSize: "0.85rem" }}
          onClick={() => setOrientation("vertical")}
        >
          ⬇️ Vertical
        </button>
      </div>

      {/* Grid */}
      <div
        className="ship-placement-grid"
        style={{ gridTemplateColumns: `repeat(${boardSize}, 1fr)`, maxWidth: `${boardSize * 60}px` }}
      >
        {Array.from({ length: boardSize * boardSize }, (_, i) => {
          const pos = i + 1;
          const isOccupied = occupiedPositions.has(pos);
          const isPreview = previewPositions.has(pos);
          const shipIdx = Object.entries(placed).find(([_, p]) => p.includes(pos))?.[0];
          return (
            <div
              key={pos}
              className={`ship-cell ${isOccupied ? "placed" : ""} ${isPreview ? "preview" : ""}`}
              style={isOccupied ? { background: teamColor, borderColor: teamColor } : {}}
              onClick={() => {
                if (selectedShip !== null) placeShip(pos);
                else if (shipIdx !== undefined) removeShip(parseInt(shipIdx));
              }}
              onMouseEnter={() => selectedShip !== null && setHoverPos(pos)}
              onMouseLeave={() => setHoverPos(null)}
            >
              {pos}
            </div>
          );
        })}
      </div>

      {/* Ship list */}
      <div className="ship-list">
        {ships.map((ship, idx) => {
          const isPlaced = !!placed[idx];
          const isSelected = selectedShip === idx;
          return (
            <div
              key={idx}
              className={`ship-item ${isPlaced ? "placed" : ""} ${isSelected ? "selected" : ""}`}
            >
              <span className="ship-item-name">
                {isPlaced ? "✅" : "⬜"} {ship.name} ({ship.size} tiles)
              </span>
              {!isPlaced && (
                <button
                  className="btn-secondary"
                  style={{ padding: "4px 12px", fontSize: "0.8rem" }}
                  onClick={() => setSelectedShip(isSelected ? null : idx)}
                >
                  {isSelected ? "Cancel" : "Place"}
                </button>
              )}
              {isPlaced && (
                <button
                  className="btn-ghost"
                  style={{ padding: "4px 12px", fontSize: "0.8rem" }}
                  onClick={() => removeShip(idx)}
                >
                  Remove
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16 }}>
        <button
          className="btn-primary"
          onClick={confirm}
          disabled={!allPlaced || saving}
          style={{ fontSize: "1rem", padding: "12px 32px" }}
        >
          {saving ? "Saving…" : alreadyPlaced ? "Update Placement" : "Confirm Ships"}
        </button>
        {!allPlaced && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: 8 }}>
            Place all {ships.length} ships to confirm.
          </p>
        )}
      </div>
    </div>
  );
}
