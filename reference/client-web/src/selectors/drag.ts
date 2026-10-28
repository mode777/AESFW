/**
 * The connector drag path (REF-13.3 step 4): pressing and dragging with a
 * connector selected traces an axis-aligned L, x first, inclusive of both ends.
 * The path is presentation: every cell is validated by the host, never here.
 *
 * Source: REF-13.3
 */
export interface Cell {
  readonly x: number;
  readonly y: number;
}

/** The L path from `from` to `to`, x first, both ends inclusive (REF-13.3). */
export function dragPath(from: Cell, to: Cell): readonly Cell[] {
  const cells: Cell[] = [];
  const stepX = from.x <= to.x ? 1 : -1;
  for (let x = from.x; ; x += stepX) {
    cells.push({ x, y: from.y });
    if (x === to.x) break;
  }
  if (from.y !== to.y) {
    const stepY = from.y < to.y ? 1 : -1;
    for (let y = from.y + stepY; ; y += stepY) {
      cells.push({ x: to.x, y });
      if (y === to.y) break;
    }
  }
  return cells;
}

/** True when both cells are the same (a drag that never left its start). */
export const isSingleCell = (from: Cell, to: Cell): boolean => from.x === to.x && from.y === to.y;
