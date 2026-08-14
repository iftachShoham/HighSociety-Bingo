export default function BingoBoard({ tiles, teams, completedByTile, gridCols, onTileClick }) {
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
    gap: "6px",
    maxWidth: `${gridCols * 130}px`,
  };

  return (
    <div style={gridStyle} className="bingo-board">
      {tiles.map((tile) => {
        const completedTeams = completedByTile[tile.id] || [];
        const isCompleted = completedTeams.length > 0;
        return (
          <div
            key={tile.id}
            className={`bingo-tile ${isCompleted ? "completed" : ""}`}
            onClick={() => onTileClick(tile)}
          >
            <div className="bingo-tile-number">#{tile.position}</div>
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
