import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { TocRail } from '@/mdx/common/table-of-contents/toc-rail';

const rows = [
  { depth: 0, top: 104, bottom: 136 },
  { depth: 1, top: 136, bottom: 168 },
  { depth: 1, top: 168, bottom: 200 },
  { depth: 0, top: 200, bottom: 232 },
];
let measuredRailHeight = 136;

class ResizeObserverStub implements ResizeObserver {
  static instances: ResizeObserverStub[] = [];

  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();

  constructor(readonly callback: ResizeObserverCallback) {
    ResizeObserverStub.instances.push(this);
  }
}

function RailHarness({ rowCount = rows.length }: { rowCount?: number }) {
  return (
    <ul>
      <TocRail linkCount={rowCount} />
      {rows.slice(0, rowCount).map(({ depth, top, bottom }) => (
        <li key={top}>
          <a
            href={`#row-${top}`}
            data-active="false"
            data-bottom={bottom}
            data-toc-depth={depth}
            data-top={top}
          >
            Row
          </a>
        </li>
      ))}
    </ul>
  );
}

describe('TocRail', () => {
  beforeEach(() => {
    measuredRailHeight = 136;
    ResizeObserverStub.instances = [];
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);

    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: Element) {
        if (this instanceof HTMLUListElement) {
          return new DOMRect(0, 100, 240, 136);
        }

        if (this instanceof HTMLAnchorElement) {
          const top = Number(this.dataset.top);
          const bottom = Number(this.dataset.bottom);
          return new DOMRect(0, top, 200, bottom - top);
        }

        return new DOMRect();
      }
    );

    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this instanceof HTMLUListElement ? measuredRailHeight : 0;
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('should render one continuous active stroke over the shared base path', () => {
    const { container } = render(<RailHarness />);

    const basePath = container.querySelector<SVGPathElement>(
      '[data-toc-rail="base"] path'
    );
    const activePaths = container.querySelectorAll<SVGPathElement>(
      '[data-toc-rail="active"] path'
    );

    expect(basePath?.getAttribute('d')).toBe(
      'M 8.5 4 V 36 V 38 Q 8.5 40 10.5 42 L 18.5 48 Q 20.5 50 20.5 52 V 54 V 68 V 100 V 102 Q 20.5 104 18.5 106 L 10.5 112 Q 8.5 114 8.5 116 V 118 V 132'
    );
    expect(activePaths).toHaveLength(1);
    expect(activePaths[0].getAttribute('d')).toBe(basePath?.getAttribute('d'));
  });

  test('should observe every measured row and disconnect on unmount', () => {
    const { unmount } = render(<RailHarness />);
    const observer = ResizeObserverStub.instances[0];

    expect(observer.observe).toHaveBeenCalledTimes(rows.length + 1);

    unmount();

    expect(observer.disconnect).toHaveBeenCalledTimes(1);
  });

  test('should remeasure and observe rows added after the first render', () => {
    const { rerender } = render(<RailHarness rowCount={0} />);
    const initialObserver = ResizeObserverStub.instances[0];

    expect(initialObserver.observe).toHaveBeenCalledTimes(1);

    rerender(<RailHarness rowCount={rows.length} />);

    const nextObserver = ResizeObserverStub.instances[1];
    expect(initialObserver.disconnect).toHaveBeenCalledTimes(1);
    expect(nextObserver.observe).toHaveBeenCalledTimes(rows.length + 1);
  });

  test('should update geometry and active insets from an observed row resize', () => {
    const { container } = render(<RailHarness />);
    const list = container.querySelector('ul');
    const lastLink =
      container.querySelectorAll<HTMLAnchorElement>('a[data-toc-depth]')[3];
    const observer = ResizeObserverStub.instances[0];

    measuredRailHeight = 152;
    lastLink.dataset.active = 'true';
    lastLink.dataset.bottom = '248';
    lastLink.dataset.tocDepth = '2';

    act(() => observer.callback([], observer));

    const baseRail = container.querySelector<SVGSVGElement>(
      '[data-toc-rail="base"]'
    );
    const basePath = baseRail?.querySelector('path');

    expect(baseRail?.getAttribute('height')).toBe('152');
    expect(baseRail?.getAttribute('width')).toBe('41');
    expect(basePath?.getAttribute('d')).toMatch(/V 148$/);
    expect(list?.style.getPropertyValue('--toc-active-top')).toBe('100px');
    expect(list?.style.getPropertyValue('--toc-active-bottom')).toBe('4px');
  });
});
