import { describe, expect, test } from 'vitest';

import {
  flattenMenuItems,
  getConnectorGeometry,
} from '@/mdx/common/table-of-contents/toc-tree';
import type { MenuItem } from '@/mdx/common/table-of-contents/toc';

function createMenuItem(
  title: string,
  level: MenuItem['level'],
  children?: MenuItem[]
): MenuItem {
  const element = document.createElement('h2');

  return {
    title,
    level,
    link: `#${title}`,
    element,
    children,
  };
}

describe('flattenMenuItems', () => {
  test('should preserve document order and derive visual depth', () => {
    const items = [
      createMenuItem('parent', 2, [
        createMenuItem('child-a', 3),
        createMenuItem('child-b', 3),
      ]),
      createMenuItem('next', 2),
    ];

    expect(
      flattenMenuItems(items).map(({ item, depth }) => ({
        title: item.title,
        depth,
      }))
    ).toEqual([
      { title: 'parent', depth: 0 },
      { title: 'child-a', depth: 1 },
      { title: 'child-b', depth: 1 },
      { title: 'next', depth: 0 },
    ]);
  });
});

describe('getConnectorGeometry', () => {
  test('should render a straight root connector', () => {
    expect(getConnectorGeometry(0, 0)).toEqual({
      lineX: 8.5,
      lineStartY: 6,
      paddingInlineStart: 20,
      transitionPath: null,
      width: 17,
    });
  });

  test('should bend into a child depth', () => {
    expect(getConnectorGeometry(1, 0)).toEqual({
      lineX: 20.5,
      lineStartY: 12,
      paddingInlineStart: 32,
      transitionPath: 'M 8.5 0 L 8.5 0 L 20.5 12',
      width: 29,
    });
  });

  test('should bend back to the parent depth', () => {
    expect(getConnectorGeometry(0, 1)).toEqual({
      lineX: 8.5,
      lineStartY: 12,
      paddingInlineStart: 20,
      transitionPath: 'M 20.5 0 L 20.5 0 L 8.5 12',
      width: 29,
    });
  });
});
