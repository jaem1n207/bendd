import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { DockDemo } from '@/components/home/ui/dock-demo';
import { DockMotionMode } from '@/components/navigation/consts/dock';
import { createDockMotion } from '@/components/navigation/lib/dock-motion';
import { NavigationItemTooltip } from '@/components/navigation/ui/navigation-item-tooltip';

const motion = vi.hoisted(() => ({
  animate: vi.fn(() => ({ stop: vi.fn() })),
}));
vi.mock('motion/react', async importOriginal => ({
  ...(await importOriginal<typeof import('motion/react')>()),
  animate: motion.animate,
}));
vi.mock('@/hooks/use-prefers-reduced-motion', () => ({
  usePrefersReducedMotion: () => false,
}));
vi.mock('use-sound', () => ({ default: () => [vi.fn()] }));

beforeEach(() => {
  motion.animate.mockClear();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  );
});
afterEach(() => vi.unstubAllGlobals());

test('uses the existing separator for settings without adding a Resize Dock icon', () => {
  const { container } = render(<DockDemo />);
  expect(screen.queryByRole('slider', { name: 'Resize Dock' })).toBeNull();
  const separator = container.querySelector('[data-dock-separator]');
  expect(separator).not.toBeNull();
  if (!separator) {
    throw new Error('Dock separator missing');
  }
  fireEvent.contextMenu(separator);
  expect(screen.getByRole('dialog', { name: 'Dock 설정' })).toBeDefined();
  expect(screen.getByRole('slider', { name: 'Dock 크기' })).toBeDefined();
  expect(screen.getByRole('slider', { name: '아이콘 확대' })).toBeDefined();
});

test('activates the button immediately without an upward bounce', () => {
  const activated = vi.fn();
  render(
    <NavigationItemTooltip name="Home">
      <button onClick={activated}>Home</button>
    </NavigationItemTooltip>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Home' }), { detail: 1 });
  expect(activated).toHaveBeenCalledOnce();
  expect(motion.animate).not.toHaveBeenCalled();
});

test('magnifies a hovered icon relative to its base size', () => {
  let callback: FrameRequestCallback | undefined;
  vi.stubGlobal('requestAnimationFrame', (frame: FrameRequestCallback) => {
    callback = frame;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {
    callback = undefined;
  });
  const root = document.createElement('div');
  root.style.setProperty('--dock-size', '40px');
  root.innerHTML =
    '<div data-dock-backdrop></div><div data-dock-viewport><div data-dock-rail><div data-navigation-item data-dock-label="Home"><button>Home</button></div></div></div><div data-dock-tooltip></div>';
  document.body.append(root);
  const item = root.querySelector<HTMLElement>('[data-navigation-item]');
  const rail = root.querySelector<HTMLElement>('[data-dock-rail]');
  const viewport = root.querySelector<HTMLElement>('[data-dock-viewport]');
  if (!item || !rail || !viewport) {
    throw new Error('Incomplete fixture');
  }
  Object.defineProperty(rail, 'offsetWidth', { value: 60 });
  Object.defineProperty(viewport, 'clientWidth', { value: 60 });
  Object.defineProperty(item, 'offsetWidth', { value: 40 });
  Object.defineProperty(item, 'offsetLeft', { value: 10 });
  Object.defineProperty(document.documentElement, 'clientWidth', {
    configurable: true,
    value: 1000,
  });
  rail.getBoundingClientRect = () => new DOMRect(470, 500, 60, 60);
  root.getBoundingClientRect = rail.getBoundingClientRect;
  item.getBoundingClientRect = () => new DOMRect(480, 508, 40, 40);
  const dispose = createDockMotion({
    root,
    mode: DockMotionMode.Animated,
    tooltipId: 'tip',
    onTooltip: vi.fn(),
  });
  item.dispatchEvent(
    new MouseEvent('pointermove', { bubbles: true, clientX: 500 })
  );
  for (let frame = 0; frame < 60; frame += 1) {
    callback?.((frame * 1000) / 60);
  }
  expect(item.style.transform).toContain('scale(1.6)');
  dispose();
  root.remove();
});
