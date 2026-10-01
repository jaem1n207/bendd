import { beforeEach, describe, expect, test, vi } from 'vitest';

import { DockMotionMode } from '@/components/navigation/consts/dock';
import { createDockMotion } from '@/components/navigation/lib/dock-motion';

function fixture(mode = DockMotionMode.Animated) {
  const root = document.createElement('div');
  root.innerHTML = `<div data-dock-backdrop></div><div data-dock-viewport><div data-dock-rail>${['Home', 'Craft', 'Article'].map(name => `<div data-navigation-item data-dock-label="${name}"><button>${name}</button></div>`).join('')}</div></div><div data-dock-tooltip></div>`;
  document.body.append(root);
  const rail = root.querySelector<HTMLElement>('[data-dock-rail]');
  const viewport = root.querySelector<HTMLElement>('[data-dock-viewport]');
  if (!rail || !viewport) {
    throw new Error('Dock fixture is incomplete');
  }
  Object.defineProperty(rail, 'offsetWidth', { value: 152 });
  Object.defineProperty(viewport, 'clientWidth', { value: 152 });
  rail.getBoundingClientRect = () => new DOMRect(200, 500, 152, 56);
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
    size: 40,
    magnification: 80,
    mode,
    tooltipId: 'dock-tip',
    onTooltip: tooltip,
  });
  const move = (index: number) => {
    items[index].dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        clientX: 228 + index * 48,
      })
    );
  };
  return { root, items, tooltip, dispose, move };
}

describe('dock motion lifecycle', () => {
  let frames: Map<number, FrameRequestCallback>;
  let next: number;
  let time: number;
  const tick = () => {
    time += 1000 / 60;
    const batch = [...frames.values()];
    frames.clear();
    batch.forEach(frame => frame(time));
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

  test('keeps one tooltip selection and follows direction without updates on every frame', () => {
    const dock = fixture();
    dock.move(0);
    dock.move(1);
    dock.move(1);
    dock.move(0);
    expect(
      dock.tooltip.mock.calls.map(([tip]) => [tip?.name, tip?.direction])
    ).toEqual([
      ['Home', 1],
      ['Craft', 1],
      ['Home', -1],
    ]);
    for (let i = 0; i < 100; i += 1) {
      tick();
    }
    expect(dock.tooltip).toHaveBeenCalledTimes(3);
    expect(frames.size).toBe(0);
    expect(dock.root.dataset.dockAnimating).toBe('false');
    dock.dispose();
  });

  test('settles at rest after pointer exit and cancels a pending frame on disposal', () => {
    const dock = fixture();
    dock.move(1);
    for (let i = 0; i < 12; i += 1) {
      tick();
    }
    expect(dock.items[1].style.transform).not.toBe('none');
    dock.root.dispatchEvent(new MouseEvent('pointerleave'));
    for (let i = 0; i < 100; i += 1) {
      tick();
    }
    expect(dock.items.every(item => item.style.transform === 'none')).toBe(
      true
    );
    expect(frames.size).toBe(0);
    dock.move(1);
    expect(frames.size).toBe(1);
    dock.dispose();
    expect(frames.size).toBe(0);
  });

  test('resets immediately for keyboard input and waits for fresh pointer movement', () => {
    const dock = fixture();
    dock.move(1);
    tick();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
    );
    dock.items[0].querySelector('button')?.focus();
    expect(dock.items.every(item => item.style.transform === 'none')).toBe(
      true
    );
    expect(frames.size).toBe(0);
    expect(dock.tooltip).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'Home', input: 'keyboard' })
    );
    dock.dispose();
    const resumed = fixture();
    tick();
    expect(resumed.items.every(item => item.style.transform === 'none')).toBe(
      true
    );
    resumed.move(1);
    tick();
    expect(resumed.items[1].style.transform).not.toBe('none');
    resumed.dispose();
  });

  test('clears a pointer tooltip when keyboard focus is outside this Dock', () => {
    const dock = fixture();
    dock.move(1);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
    );
    expect(dock.tooltip).toHaveBeenLastCalledWith(null);
    dock.items[1].querySelector('button')?.focus();
    expect(dock.tooltip).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'Craft', input: 'keyboard' })
    );
    dock.dispose();
  });

  test('keeps reduced motion static while still exposing tooltips', () => {
    const dock = fixture(DockMotionMode.Static);
    dock.move(1);
    for (let i = 0; i < 5; i += 1) {
      tick();
    }
    expect(dock.tooltip).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'Craft' })
    );
    expect(dock.items.every(item => item.style.transform === 'none')).toBe(
      true
    );
    expect(frames.size).toBe(0);
    dock.dispose();
  });
});
