import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { DockDemo } from '@/components/home/ui/dock-demo';
import { useDockPreferences } from '@/components/navigation/model/dock-preferences';
import { DockSurface } from '@/components/navigation/ui/dock-surface';
import { NavigationAnimateTrigger } from '@/components/navigation/ui/navigation-animate-trigger';

const preference = vi.hoisted(() => ({ reduced: false }));
vi.mock('@/hooks/use-prefers-reduced-motion', () => ({
  usePrefersReducedMotion: () => preference.reduced,
}));
vi.mock('use-sound', () => ({ default: () => [vi.fn()] }));

let frames: Map<number, FrameRequestCallback>;
const tick = () => {
  const batch = [...frames.values()];
  frames.clear();
  act(() => batch.forEach(frame => frame(0)));
};
function emit(target: EventTarget, type: string, clientY = 200) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientY,
    button: 0,
  });
  Object.defineProperties(event, {
    pointerId: { value: 1 },
    isPrimary: { value: true },
    pointerType: { value: 'mouse' },
  });
  act(() => target.dispatchEvent(event));
}
function capture(handle: HTMLElement) {
  let active = false;
  handle.setPointerCapture = () => {
    active = true;
  };
  handle.hasPointerCapture = () => active;
  handle.releasePointerCapture = () => {
    active = false;
  };
}

beforeEach(() => {
  frames = new Map();
  let next = 0;
  preference.reduced = false;
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
  localStorage.clear();
  useDockPreferences.getState().reset();
});
afterEach(() => vi.unstubAllGlobals());

test('puts an accessible vertical Resize Dock control outside the scrolling viewport', () => {
  render(
    <DockSurface size={40} onSizeChange={vi.fn()}>
      <button>Home</button>
    </DockSurface>
  );
  const handle = screen.getByRole('slider', { name: 'Resize Dock' });
  expect(handle.getAttribute('aria-orientation')).toBe('vertical');
  expect(handle.getAttribute('aria-valuenow')).toBe('40');
  expect(handle.closest('[data-dock-viewport]')).toBeNull();
  expect(handle.closest('[data-dock]')?.getAttribute('data-dock-mode')).toBe(
    'animated'
  );
});

test('saves only the released real Dock size while the demo owns its separate size', () => {
  render(
    <>
      <NavigationAnimateTrigger>
        <button>Home</button>
      </NavigationAnimateTrigger>
      <DockDemo />
    </>
  );
  const site = within(
    screen.getByRole('group', { name: '사이트 탐색 Dock' })
  ).getByRole('slider', { name: 'Resize Dock' });
  const demo = within(
    screen.getByRole('group', { name: 'Craft Dock 데모' })
  ).getByRole('slider', { name: 'Resize Dock' });
  capture(site);
  capture(demo);
  const writes = vi.spyOn(Storage.prototype, 'setItem');
  emit(site, 'pointerdown');
  emit(site, 'pointermove', 176);
  tick();
  expect(site.getAttribute('aria-valuenow')).toBe('52');
  expect(demo.getAttribute('aria-valuenow')).toBe('40');
  expect(useDockPreferences.getState().size).toBe(40);
  expect(writes).not.toHaveBeenCalled();
  emit(site, 'pointerup', 176);
  expect(writes).toHaveBeenCalledOnce();
  expect(useDockPreferences.getState().size).toBe(52);
  fireEvent.keyDown(demo, { key: 'End' });
  expect(demo.getAttribute('aria-valuenow')).toBe('64');
  expect(site.getAttribute('aria-valuenow')).toBe('52');
  expect(writes).toHaveBeenCalledOnce();
  writes.mockRestore();
});

test('keeps direct resize functional in reduced motion and cleans up on unmount', () => {
  preference.reduced = true;
  const commit = vi.fn();
  const { unmount } = render(
    <DockSurface size={40} onSizeChange={commit}>
      <button>Home</button>
    </DockSurface>
  );
  const handle = screen.getByRole('slider', { name: 'Resize Dock' });
  capture(handle);
  emit(handle, 'pointerdown');
  emit(handle, 'pointermove', 180);
  tick();
  expect(handle.getAttribute('aria-valuenow')).toBe('50');
  unmount();
  expect(commit).not.toHaveBeenCalled();
  expect(document.documentElement.style.cursor).toBe('');
  expect(document.documentElement.style.userSelect).toBe('');
  expect(frames.size).toBe(0);
});

test('leaves the live resize badge text to the driver rather than React reconciliation', () => {
  const html = renderToStaticMarkup(
    <DockSurface size={40} onSizeChange={vi.fn()}>
      <button>Home</button>
    </DockSurface>
  );
  const server = document.createElement('div');
  server.innerHTML = html;
  expect(
    server.querySelector('[data-dock-size-output]')?.childNodes.length
  ).toBe(0);
  expect(
    server.querySelector('[role="slider"]')?.getAttribute('aria-valuetext')
  ).toBe('40px');
});

test('keeps a driver-owned preview through parent and child layout updates before unmount', () => {
  const commit = vi.fn();
  const { rerender, unmount } = render(
    <DockSurface size={40} onSizeChange={commit}>
      <button>Home</button>
    </DockSurface>
  );
  const dock = screen.getByRole('group', { name: 'Dock' });
  const handle = within(dock).getByRole('slider', { name: 'Resize Dock' });
  const badge = dock.querySelector('[data-dock-size-output]');
  capture(handle);
  emit(handle, 'pointerdown');
  emit(handle, 'pointermove', 176);
  tick();
  expect(badge?.textContent).toBe('52px');
  rerender(
    <DockSurface size={40} onSizeChange={commit} label="Updated Dock">
      <div>
        <button>Home</button>
        <button>Craft</button>
      </div>
    </DockSurface>
  );
  expect(badge?.textContent).toBe('52px');
  emit(handle, 'pointerup', 176);
  rerender(
    <DockSurface size={52} onSizeChange={commit} label="Updated Dock">
      <button>Home</button>
    </DockSurface>
  );
  expect(badge?.textContent).toBe('52px');
  unmount();
  expect(commit).toHaveBeenCalledExactlyOnceWith(52);
  expect(document.documentElement.style.cursor).toBe('');
  expect(frames.size).toBe(0);
});
