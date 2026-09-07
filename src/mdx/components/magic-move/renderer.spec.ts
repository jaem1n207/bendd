import { afterEach, describe, expect, it, vi } from 'vitest';
import { MagicMoveRenderer } from 'shiki-magic-move/renderer';
import type { KeyedTokensInfo } from 'shiki-magic-move/types';

function tokens(keys: string[]): KeyedTokensInfo {
  return {
    code: keys.join(''),
    hash: keys.join(''),
    lineNumbers: false,
    tokens: keys.map((key, offset) => ({ key, content: key, offset })),
  };
}

describe('MagicMove renderer layout batching', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('measures every moved token before applying any inverse transforms', async () => {
    const container = document.createElement('pre');
    const renderer = new MagicMoveRenderer(container, {
      stagger: 3,
      globalScale: 2,
    });
    renderer.replace(tokens(['a', 'b', 'c']));
    const originalNodes = Array.from(
      container.querySelectorAll('.shiki-magic-move-item')
    );
    const measurementsAfterWrites: string[] = [];

    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: Element) {
        if (originalNodes.includes(this)) {
          if (
            originalNodes.some(
              node => node instanceof HTMLElement && node.style.transform
            )
          ) {
            measurementsAfterWrites.push(this.textContent ?? '');
          }
          return new DOMRect(
            Array.from(container.children).indexOf(this) * 20,
            0,
            20,
            20
          );
        }
        return new DOMRect(0, 0, 100, 20);
      }
    );
    container.getAnimations = () => [];
    for (const node of originalNodes) {
      node.getAnimations = () => [];
    }
    const transformWrites = vi.spyOn(
      CSSStyleDeclaration.prototype,
      'transform',
      'set'
    );

    const animation = renderer.render(tokens(['c', 'a', 'b']));

    expect(measurementsAfterWrites).toEqual([]);
    expect(transformWrites.mock.calls.flat().filter(Boolean)).toEqual([
      'translate(20px, 0px)',
      'translate(-10px, 0px)',
      'translate(-10px, 0px)',
    ]);
    expect(
      Array.from(container.querySelectorAll('.shiki-magic-move-item'))
    ).toEqual([originalNodes[2], originalNodes[0], originalNodes[1]]);

    await animation;
    expect(container.textContent).toBe('cab');
  });

  it('discovers animations once and waits for the leaving token before removing it', async () => {
    const container = document.createElement('pre');
    const renderer = new MagicMoveRenderer(container);
    renderer.replace(tokens(['a', 'b', 'c']));
    const nodes = Array.from(
      container.querySelectorAll('.shiki-magic-move-item')
    );
    const leaving = nodes[2];
    let finishLeave = () => {};
    const finished = new Promise<void>(resolve => {
      finishLeave = resolve;
    });
    const getAnimations = vi
      .fn()
      .mockReturnValue([{ effect: { target: leaving }, finished }]);
    container.getAnimations = getAnimations;
    const tokenLookups = nodes.map(node => {
      const lookup = vi
        .fn()
        .mockReturnValue(node === leaving ? [{ finished }] : []);
      node.getAnimations = lookup;
      return lookup;
    });

    const animation = renderer.render(tokens(['b', 'a']));

    expect(getAnimations).toHaveBeenCalledTimes(1);
    expect(getAnimations).toHaveBeenCalledWith({ subtree: true });
    for (const lookup of tokenLookups) {
      expect(lookup).not.toHaveBeenCalled();
    }
    await Promise.resolve();
    await Promise.resolve();
    expect(container.contains(leaving)).toBe(true);
    expect(nodes[0].classList.contains('shiki-magic-move-move')).toBe(false);

    finishLeave();
    await animation;
    expect(container.contains(leaving)).toBe(false);
    expect(container.textContent).toBe('ba');
  });

  it('does not create transform transitions for tokens that stay in place', async () => {
    const container = document.createElement('pre');
    container.getAnimations = () => [];
    const renderer = new MagicMoveRenderer(container);
    renderer.replace(tokens(['a', 'b']));
    const nodes = Array.from(
      container.querySelectorAll('.shiki-magic-move-item')
    );
    for (const node of nodes) {
      node.getAnimations = () => [];
    }
    const transformWrites = vi.spyOn(
      CSSStyleDeclaration.prototype,
      'transform',
      'set'
    );

    const animation = renderer.render(tokens(['a', 'b']));

    expect(transformWrites.mock.calls.flat().filter(Boolean)).toEqual([]);
    expect(
      nodes.some(node => node.classList.contains('shiki-magic-move-move'))
    ).toBe(false);
    await animation;
    expect(container.textContent).toBe('ab');
  });
});
