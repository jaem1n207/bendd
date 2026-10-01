import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  DockInteraction,
  DockMotionMode,
} from '@/components/navigation/consts/dock';
import { createDockMotion } from '@/components/navigation/lib/dock-motion';

function fixture(mode = DockMotionMode.Animated, size = 40) {
  const width = size * 3 + 32;
  const root = document.createElement('div');
  root.innerHTML = `<div data-dock-backdrop></div><div data-dock-viewport><div data-dock-rail>${['Home', 'Craft', 'Article'].map(name => `<div data-navigation-item data-dock-label="${name}"><button aria-describedby="help">${name}</button></div>`).join('')}</div></div><div data-dock-tooltip></div>`;
  document.body.append(root);
  const rail = root.querySelector<HTMLElement>('[data-dock-rail]');
  const viewport = root.querySelector<HTMLElement>('[data-dock-viewport]');
  if (!rail || !viewport) {
    throw new Error('Incomplete Dock fixture');
  }
  Object.defineProperty(rail, 'offsetWidth', { value: width });
  Object.defineProperty(viewport, 'clientWidth', {
    value: width,
    configurable: true,
  });
  root.getBoundingClientRect = () => new DOMRect(200, 500, width, size + 20);
  rail.getBoundingClientRect = () =>
    new DOMRect(200 - viewport.scrollLeft, 500, width, size + 20);
  const items = Array.from(
    root.querySelectorAll<HTMLElement>('[data-navigation-item]')
  );
  items.forEach((item, index) => {
    Object.defineProperty(item, 'offsetLeft', {
      value: 8 + index * (size + 8),
    });
    Object.defineProperty(item, 'offsetWidth', { value: size });
  });
  const tooltip = vi.fn();
  const dispose = createDockMotion({
    root,
    mode,
    tooltipId: 'dock-tip',
    onTooltip: tooltip,
  });
  const move = (index: number) =>
    items[index].dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 208 + size / 2 + index * (size + 8) - viewport.scrollLeft,
        clientY: 508 + size / 2,
      })
    );
  return { root, items, viewport, tooltip, dispose, move };
}
describe('Dock magnification and shared tooltip lifecycle', () => {
  let frames: Map<number, FrameRequestCallback>;
  let next: number;
  let time: number;
  const tick = () => {
    time += 1000 / 60;
    const batch = [...frames.values()];
    frames.clear();
    batch.forEach(frame => frame(time));
  };
  const settle = () => {
    for (let i = 0; i < 120; i += 1) {
      tick();
    }
  };
  beforeEach(() => {
    document.body.replaceChildren();
    frames = new Map();
    next = 0;
    time = 0;
    vi.stubGlobal('requestAnimationFrame', (frame: FrameRequestCallback) => {
      frames.set(++next, frame);
      return next;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      }
    );
    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      value: 1000,
    });
  });
  test('keeps one tooltip, reads direction and stops the frame loop when settled', () => {
    const dock = fixture();
    dock.move(0);
    dock.move(1);
    dock.move(1);
    dock.move(0);
    settle();
    expect(
      dock.tooltip.mock.calls.map(([tip]) => [tip?.name, tip?.direction])
    ).toEqual([
      ['Home', 1],
      ['Craft', 1],
      ['Home', -1],
    ]);
    expect(dock.tooltip).toHaveBeenCalledTimes(3);
    expect(frames.size).toBe(0);
    expect(dock.root.dataset.dockAnimating).toBe('false');
    dock.dispose();
  });
  test('magnifies the hovered icon and neighbors, then returns to rest', () => {
    const dock = fixture();
    dock.move(1);
    settle();
    expect(dock.items[1].style.transform).toContain('scale(1.6)');
    expect(dock.items[0].style.transform).not.toBe('none');
    dock.root.dispatchEvent(new MouseEvent('pointerleave'));
    settle();
    expect(dock.items.every(item => item.style.transform === 'none')).toBe(
      true
    );
    expect(frames.size).toBe(0);
    dock.dispose();
  });
  test('keeps magnification above the Dock through horizontal motion, but releases at the tooltip', () => {
    const dock = fixture();
    dock.move(1);
    settle();
    const normal = dock.items[1].style.transform;
    dock.root.dispatchEvent(
      new MouseEvent('pointerleave', {
        clientX: 276,
        clientY: 490,
      })
    );
    document.body.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 276,
        clientY: 490,
      })
    );
    settle();
    expect(dock.items[1].style.transform).toBe(normal);
    expect(dock.tooltip).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'Craft' })
    );
    document.body.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 324,
        clientY: 490,
      })
    );
    settle();
    expect(dock.items[2].style.transform).toContain('scale(1.6)');
    expect(dock.tooltip).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'Article' })
    );
    document.body.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 228,
        clientY: 490,
      })
    );
    settle();
    expect(dock.items[0].style.transform).toContain('scale(1.6)');
    expect(dock.tooltip).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'Home', direction: -1 })
    );
    // The tooltip ends at root.top - growth: 500 - 24 = 476.
    document.body.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 228,
        clientY: 476,
      })
    );
    settle();
    expect(dock.items.every(item => item.style.transform === 'none')).toBe(
      true
    );
    expect(dock.tooltip).toHaveBeenLastCalledWith(null);
    dock.dispose();
  });

  test.each([
    [32, 1],
    [32, 2],
    [40, 1.6],
    [64, 2],
  ])(
    'derives the holding height from %ipx at %s times magnification',
    (size, magnification) => {
      const dock = fixture(DockMotionMode.Animated, size);
      dock.dispose.setPreferences({ size, magnification });
      dock.move(1);
      settle();
      const original = dock.items[1].style.transform;
      const edge = 500 - size * (magnification - 1);
      const x = 216 + size * 1.5;
      dock.root.dispatchEvent(
        new MouseEvent('pointerleave', { clientX: x, clientY: edge + 1 })
      );
      document.body.dispatchEvent(
        new MouseEvent('pointermove', {
          bubbles: true,
          clientX: x,
          clientY: edge + 1,
        })
      );
      settle();
      expect(dock.items[1].style.transform).toBe(original);
      document.body.dispatchEvent(
        new MouseEvent('pointermove', {
          bubbles: true,
          clientX: x,
          clientY: edge,
        })
      );
      settle();
      expect(dock.tooltip).toHaveBeenLastCalledWith(null);
      expect(dock.items.every(item => item.style.transform === 'none')).toBe(
        true
      );
      dock.dispose();
    }
  );

  test('keeps the current spring state when reversing above the Dock', () => {
    const dock = fixture();
    dock.move(0);
    tick();
    const before = dock.items.map(item => item.style.transform);
    document.body.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 324,
        clientY: 490,
      })
    );
    expect(dock.items.map(item => item.style.transform)).toEqual(before);
    tick();
    const reversing = dock.items.map(item => item.style.transform);
    document.body.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 228,
        clientY: 490,
      })
    );
    expect(dock.items.map(item => item.style.transform)).toEqual(reversing);
    settle();
    expect(dock.items[0].style.transform).toContain('scale(1.6)');
    dock.dispose();
  });

  test('yields to another panel without intercepting its input', () => {
    const dock = fixture();
    const panel = document.createElement('div');
    panel.setAttribute('role', 'dialog');
    document.body.append(panel);
    dock.move(1);
    settle();
    const event = new MouseEvent('pointermove', {
      bubbles: true,
      cancelable: true,
      clientX: 276,
      clientY: 490,
    });
    panel.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    settle();
    expect(dock.tooltip).toHaveBeenLastCalledWith(null);
    dock.dispose();
  });

  test('does not activate from the upper region before entering the Dock', () => {
    const dock = fixture();
    document.body.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 276,
        clientY: 490,
      })
    );
    settle();
    expect(dock.tooltip).not.toHaveBeenCalled();
    expect(dock.items.every(item => item.style.transform === 'none')).toBe(
      true
    );
    dock.dispose();
  });

  test('preserves other descriptions and moves the tooltip with the enlarged item', () => {
    const dock = fixture();
    dock.move(1);
    settle();
    expect(
      dock.items[1].querySelector('button')?.getAttribute('aria-describedby')
    ).toBe('help dock-tip');
    const anchor = dock.root.querySelector<HTMLElement>('[data-dock-tooltip]');
    expect(anchor?.style.transform).toContain('translate3d(76px, -24');
    dock.move(2);
    settle();
    expect(
      dock.items[1].querySelector('button')?.getAttribute('aria-describedby')
    ).toBe('help');
    dock.dispose();
    expect(frames.size).toBe(0);
  });
  test('suppresses normal hover in settings and previews magnification at the center immediately', () => {
    const dock = fixture();
    dock.dispose.setInteraction(DockInteraction.Settings);
    dock.move(0);
    settle();
    expect(dock.items.every(item => item.style.transform === 'none')).toBe(
      true
    );
    dock.dispose.setPreferences({ size: 40, magnification: 1.85 });
    dock.dispose.setInteraction(DockInteraction.Preview);
    expect(dock.items[1].style.transform).toContain('scale(1.85)');
    expect(frames.size).toBe(0);
    dock.dispose.setInteraction(DockInteraction.Idle);
    dock.move(0);
    settle();
    expect(dock.tooltip).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'Home' })
    );
    dock.dispose();
  });
  test('resets hover immediately for keyboard input and handles focus outside the Dock', () => {
    const dock = fixture();
    dock.move(0);
    dock.move(1);
    tick();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
    );
    expect(dock.tooltip).toHaveBeenLastCalledWith(null);
    dock.items[0].querySelector('button')?.focus();
    expect(dock.tooltip).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'Home', input: 'keyboard' })
    );
    expect(dock.items.every(item => item.style.transform === 'none')).toBe(
      true
    );
    expect(frames.size).toBe(0);
    dock.dispose();
  });
  test('keeps reduced motion static even during explicit magnification preview', () => {
    const dock = fixture(DockMotionMode.Static);
    dock.move(1);
    settle();
    expect(dock.tooltip).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'Craft' })
    );
    dock.dispose.setInteraction(DockInteraction.Preview);
    expect(dock.items.every(item => item.style.transform === 'none')).toBe(
      true
    );
    expect(frames.size).toBe(0);
    dock.dispose();
  });
  test('disables growth when the rail overflows and queries current scroll positions', () => {
    const dock = fixture();
    Object.defineProperty(dock.viewport, 'clientWidth', { value: 80 });
    dock.viewport.scrollLeft = 48;
    dock.viewport.dispatchEvent(new Event('scroll'));
    dock.move(1);
    settle();
    expect(dock.root.dataset.dockOverflow).toBe('true');
    expect(dock.items.every(item => item.style.transform === 'none')).toBe(
      true
    );
    expect(
      dock.root.querySelector<HTMLElement>('[data-dock-tooltip]')?.style
        .transform
    ).toBe('translate3d(28px, 0px, 0)');
    dock.dispose();
  });
  test('keeps the separator under the pointer through hover and secondary press', () => {
    const dock = fixture();
    const separator = document.createElement('button');
    separator.dataset.dockSeparator = '';
    dock.root.querySelector('[data-dock-rail]')?.append(separator);
    Object.defineProperty(separator, 'offsetLeft', { value: 152 });
    window.dispatchEvent(new Event('resize'));
    dock.move(0);
    settle();
    const position = separator.style.transform;
    expect(position).not.toBe('translateX(0px)');
    separator.dispatchEvent(
      new MouseEvent('pointermove', { bubbles: true, clientX: 360 })
    );
    settle();
    expect(separator.style.transform).toBe(position);
    separator.focus();
    expect(separator.style.transform).toBe(position);
    separator.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, button: 2 })
    );
    expect(separator.style.transform).toBe(position);
    dock.dispose();
  });
});
