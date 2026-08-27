import type { MenuItem } from '@/mdx/common/table-of-contents/toc';

const CONNECTOR_BASE_X = 8.5;
const CONNECTOR_DEPTH_STEP = 12;
const CONNECTOR_HORIZONTAL_PADDING = 20;
const CONNECTOR_STRAIGHT_START_Y = 0;
const CONNECTOR_BEND_CORNER_OFFSET_X = 2;
const CONNECTOR_BEND_LEAD_END_Y = 2;
const CONNECTOR_BEND_FIRST_CONTROL_Y = 4;
const CONNECTOR_BEND_DIAGONAL_START_Y = 6;
const CONNECTOR_BEND_DIAGONAL_END_Y = 12;
const CONNECTOR_BEND_SECOND_CONTROL_Y = 14;
const CONNECTOR_BEND_TRAIL_START_Y = 16;
const CONNECTOR_BEND_END_Y = 18;
const CONNECTOR_WIDTH_PADDING = 8.5;

export interface FlatMenuItem {
  item: MenuItem;
  depth: number;
}

export interface ConnectorGeometry {
  lineX: number;
  lineStartY: number;
  paddingInlineStart: number;
  transitionPath: string | null;
  width: number;
}

export function flattenMenuItems(items: MenuItem[], depth = 0): FlatMenuItem[] {
  return items.flatMap(item => [
    { item, depth },
    ...flattenMenuItems(item.children ?? [], depth + 1),
  ]);
}

export function getConnectorGeometry(
  depth: number,
  previousDepth: number
): ConnectorGeometry {
  const lineX = CONNECTOR_BASE_X + depth * CONNECTOR_DEPTH_STEP;
  const previousLineX = CONNECTOR_BASE_X + previousDepth * CONNECTOR_DEPTH_STEP;
  const changesDepth = depth !== previousDepth;
  const direction = Math.sign(lineX - previousLineX);
  const diagonalStartX =
    previousLineX + direction * CONNECTOR_BEND_CORNER_OFFSET_X;
  const diagonalEndX = lineX - direction * CONNECTOR_BEND_CORNER_OFFSET_X;

  return {
    lineX,
    lineStartY: changesDepth
      ? CONNECTOR_BEND_END_Y
      : CONNECTOR_STRAIGHT_START_Y,
    paddingInlineStart:
      CONNECTOR_HORIZONTAL_PADDING + depth * CONNECTOR_DEPTH_STEP,
    transitionPath: changesDepth
      ? `M ${previousLineX} 0 V ${CONNECTOR_BEND_LEAD_END_Y} Q ${previousLineX} ${CONNECTOR_BEND_FIRST_CONTROL_Y} ${diagonalStartX} ${CONNECTOR_BEND_DIAGONAL_START_Y} L ${diagonalEndX} ${CONNECTOR_BEND_DIAGONAL_END_Y} Q ${lineX} ${CONNECTOR_BEND_SECOND_CONTROL_Y} ${lineX} ${CONNECTOR_BEND_TRAIL_START_Y} V ${CONNECTOR_BEND_END_Y}`
      : null,
    width: Math.max(lineX, previousLineX) + CONNECTOR_WIDTH_PADDING,
  };
}
