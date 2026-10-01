import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  DockInteraction,
  DockMotionMode,
} from '@/components/navigation/consts/dock';
import { createDockMotion } from '@/components/navigation/lib/dock-motion';

function fixture(mode = DockMotionMode.Animated) {
  const root = document.createElement('div');
  root.innerHTML = `<div data-dock-backdrop></div><div data-dock-viewport><div data-dock-rail>${['Home', 'Craft', 'Article'].map(name => `<div data-navigation-item data-dock-label="${name}"><button aria-describedby="help">${name}</button></div>`).join('')}</div></div><div data-dock-tooltip></div>`;
  document.body.append(root);
  const rail = root.querySelector<HTMLElement>('[data-dock-rail]');
  const viewport = root.querySelector<HTMLElement>('[data-dock-viewport]');
  if (!rail || !viewport) {
    throw new Error('Incomplete Dock fixture');
  }
  Object.defineProperty(rail, 'offsetWidth', { value: 152 });
  Object.defineProperty(viewport, 'clientWidth', {
    value: 152,
    configurable: true,
  });
  root.getBoundingClientRect = () => new DOMRect(200, 500, 152, 60);
  rail.getBoundingClientRect = () =>
    new DOMRect(200 - viewport.scrollLeft, 500, 152, 60);
  const items = Array.from(
    root.querySelectorAll<HTMLElement>('[data-navigation-item]')
  );
  items.forEach((item, index) => {
    Object.defineProperty(item, 'offsetLeft', { value: 8 + index * 48 });
    Object.defineProperty(item, 'offsetWidth', { value: 40 });
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
        clientX: 228 + index * 48 - viewport.scrollLeft,
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
