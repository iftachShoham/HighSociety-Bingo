export default function BingoBoard({ tiles, teams, completedByTile, gridCols, onTileClick, showRats = false, battleshipOverlays = null }) {
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
    gap: "6px",
    maxWidth: `${gridCols * 140}px`,
  };

  return (
    <div style={gridStyle} className="bingo-board">
      {tiles.map((tile) => {
        const completedTeams = completedByTile[tile.id] || [];
        const isCompleted = completedTeams.length > 0;
        const isRat = showRats && tile.is_rat_tile;
        const isPlaceholder = !!tile.isPlaceholder;
        const overlay = battleshipOverlays?.[tile.position];
        const hasShip = overlay?.shipColor;
        const isShipSunk = overlay?.isShipSunk;
        const isHit = overlay?.isHit;
        const attackHit = overlay?.attackHit;
        const attackMiss = overlay?.attackMiss;
        return (
          <div
            key={tile.id}
            className={`bingo-tile ${isPlaceholder ? "placeholder" : ""} ${isCompleted ? "completed" : ""} ${isRat ? "rat-tile" : ""} ${hasShip ? "has-ship" : ""} ${isShipSunk ? "ship-sunk" : ""} ${isHit ? "ship-hit" : ""} ${attackHit ? "attack-hit" : ""} ${attackMiss ? "attack-miss" : ""}`}
            onClick={() => { if (!isPlaceholder) onTileClick(tile); }}
            style={hasShip ? { borderColor: overlay.shipColor } : {}}
          >
            {tile.image_url && (
              <div className="bingo-tile-image">
                <img src={tile.image_url} alt="" />
                {isCompleted && <div className="bingo-tile-overlay" />}
              </div>
            )}
            <div className="bingo-tile-number">
              #{tile.position}
              {isRat && <span className="rat-indicator">🐀</span>}
              {tile.allow_early_submit && <span className="early-indicator">🏆</span>}
              {hasShip && <span className="ship-indicator" style={{ color: overlay.shipColor }}>🚢</span>}
            </div>
            <div className="bingo-tile-task">{tile.task_description || "—"}</div>
            <div className="bingo-tile-badges">
              {completedTeams.map((teamId) => {
                const team = teams.find((t) => t.id === teamId);
                return (
                  <span
                    key={teamId}
                    className="team-dot"
                    style={{ background: team?.color || "#808080" }}
                    title={team?.name || ""}
                  />
                );
              })}
              {isHit && <span className="battle-marker hit">💥</span>}
              {attackHit && <span className="battle-marker hit">🎯</span>}
              {attackMiss && <span className="battle-marker miss">🌊</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
