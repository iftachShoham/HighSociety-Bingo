export default function BingoBoard({ tiles, teams, completedByTile, gridCols, onTileClick, showRats = false }) {
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
        return (
          <div
            key={tile.id}
            className={`bingo-tile ${isCompleted ? "completed" : ""} ${isRat ? "rat-tile" : ""}`}
            onClick={() => onTileClick(tile)}
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
