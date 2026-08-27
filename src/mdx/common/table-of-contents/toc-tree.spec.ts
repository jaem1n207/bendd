import { describe, expect, test } from 'vitest';

import {
  flattenMenuItems,
  getTocRailGeometry,
  getTocRailPadding,
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

describe('getTocRailGeometry', () => {
  test('should finish depth transitions before the next row text begins', () => {
    expect(
      getTocRailGeometry(
        [
          { depth: 0, top: 4, bottom: 36 },
          { depth: 1, top: 36, bottom: 68 },
          { depth: 1, top: 68, bottom: 100 },
          { depth: 0, top: 100, bottom: 132 },
        ],
        136
      )
    ).toEqual({
      path: 'M 8.5 4 V 30 V 31 Q 8.5 32 10.5 33 L 18.5 39 Q 20.5 40 20.5 41 V 42 V 68 V 94 V 95 Q 20.5 96 18.5 97 L 10.5 103 Q 8.5 104 8.5 105 V 106 V 132',
      width: 29,
      height: 136,
    });
  });

  test('should keep text indentation aligned with the rail depth', () => {
    expect([0, 1, 2].map(getTocRailPadding)).toEqual([20, 32, 44]);
  });
});
