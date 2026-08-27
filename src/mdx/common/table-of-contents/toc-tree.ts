import type { MenuItem } from '@/mdx/common/table-of-contents/toc';

const CONNECTOR_BASE_X = 8.5;
const CONNECTOR_DEPTH_STEP = 12;
const CONNECTOR_HORIZONTAL_PADDING = 20;
const CONNECTOR_BEND_CORNER_OFFSET_X = 2;
const CONNECTOR_BEND_START_Y = -6;
const CONNECTOR_BEND_LEAD_END_Y = -5;
const CONNECTOR_BEND_FIRST_CONTROL_Y = -4;
const CONNECTOR_BEND_DIAGONAL_START_Y = -3;
const CONNECTOR_BEND_DIAGONAL_END_Y = 3;
const CONNECTOR_BEND_SECOND_CONTROL_Y = 4;
const CONNECTOR_BEND_TRAIL_START_Y = 5;
const CONNECTOR_BEND_END_Y = 6;
const CONNECTOR_WIDTH_PADDING = 8.5;

export interface FlatMenuItem {
  item: MenuItem;
  depth: number;
}

export interface TocRailRow {
  depth: number;
  top: number;
  bottom: number;
}

export interface TocRailGeometry {
  path: string;
  width: number;
  height: number;
}

export function flattenMenuItems(items: MenuItem[], depth = 0): FlatMenuItem[] {
  return items.flatMap(item => [
    { item, depth },
    ...flattenMenuItems(item.children ?? [], depth + 1),
  ]);
}

export function getTocRailPadding(depth: number): number {
  return CONNECTOR_HORIZONTAL_PADDING + depth * CONNECTOR_DEPTH_STEP;
}

export function getTocRailGeometry(
  rows: TocRailRow[],
  height: number
): TocRailGeometry {
  if (!rows.length) {
    return {
      path: '',
      width: CONNECTOR_BASE_X + CONNECTOR_WIDTH_PADDING,
      height,
    };
  }

  const firstRow = rows[0];
  const firstX = CONNECTOR_BASE_X + firstRow.depth * CONNECTOR_DEPTH_STEP;
  const path = [`M ${firstX} ${firstRow.top}`];
  let maxX = firstX;

  for (let index = 1; index < rows.length; index++) {
    const previousRow = rows[index - 1];
    const row = rows[index];
    const previousX =
      CONNECTOR_BASE_X + previousRow.depth * CONNECTOR_DEPTH_STEP;
    const lineX = CONNECTOR_BASE_X + row.depth * CONNECTOR_DEPTH_STEP;

    maxX = Math.max(maxX, lineX);

    if (row.depth === previousRow.depth) {
      path.push(`V ${row.top}`);
      continue;
    }

    const direction = Math.sign(lineX - previousX);
    const diagonalStartX =
      previousX + direction * CONNECTOR_BEND_CORNER_OFFSET_X;
    const diagonalEndX = lineX - direction * CONNECTOR_BEND_CORNER_OFFSET_X;

    path.push(
      `V ${row.top + CONNECTOR_BEND_START_Y}`,
      `V ${row.top + CONNECTOR_BEND_LEAD_END_Y}`,
      `Q ${previousX} ${row.top + CONNECTOR_BEND_FIRST_CONTROL_Y} ${diagonalStartX} ${row.top + CONNECTOR_BEND_DIAGONAL_START_Y}`,
      `L ${diagonalEndX} ${row.top + CONNECTOR_BEND_DIAGONAL_END_Y}`,
      `Q ${lineX} ${row.top + CONNECTOR_BEND_SECOND_CONTROL_Y} ${lineX} ${row.top + CONNECTOR_BEND_TRAIL_START_Y}`,
      `V ${row.top + CONNECTOR_BEND_END_Y}`
    );
  }

  path.push(`V ${rows.at(-1)?.bottom ?? firstRow.bottom}`);

  return {
    path: path.join(' '),
    width: maxX + CONNECTOR_WIDTH_PADDING,
    height,
  };
}
