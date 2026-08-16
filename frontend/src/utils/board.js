// Fills a tiles array so the board always renders as a complete boardSize×boardSize grid.
// Missing positions get a default-named placeholder tile with a default required amount.
export function fillBoardTiles(tiles, boardSize) {
  const total = boardSize * boardSize;
  const byPos = {};
  tiles.forEach((t) => {
    if (t.position >= 1 && t.position <= total) byPos[t.position] = t;
  });
  const result = [];
  for (let pos = 1; pos <= total; pos++) {
    if (byPos[pos]) {
      result.push(byPos[pos]);
    } else {
      result.push({
        id: `placeholder-${pos}`,
        position: pos,
        task_description: `Tile #${pos}`,
        required_submissions: 1,
        image_url: "",
        is_rat_tile: false,
        allow_early_submit: false,
        isPlaceholder: true,
      });
    }
  }
  return result;
}
