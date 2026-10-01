import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { DockDemo } from '@/components/home/ui/dock-demo';
import { useDockPreferences } from '@/components/navigation/model/dock-preferences';
import { DockSeparator } from '@/components/navigation/ui/dock-separator';
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
function emit(
  target: EventTarget,
  type: string,
  options: { y?: number; x?: number; pointerType?: string } = {}
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientY: options.y ?? 200,
    clientX: options.x ?? 100,
    button: 0,
  });
  Object.defineProperties(event, {
    pointerId: { value: 1 },
    isPrimary: { value: true },
    pointerType: { value: options.pointerType ?? 'mouse' },
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
    emit(handle, 'lostpointercapture');
  };
}
function site() {
  return (
    <NavigationAnimateTrigger>
      <button>Home</button>
      <DockSeparator />
      <button>Craft</button>
      <DockSeparator />
    </NavigationAnimateTrigger>
  );
}
function openSettings() {
  const view = render(site());
  const dock = screen.getByRole('group', { name: '사이트 탐색 Dock' });
  const handle = within(dock).getAllByRole('slider', {
    name: 'Dock 크기 조절',
  })[0];
  handle.getBoundingClientRect = () => new DOMRect(500, 600, 24, 44);
  fireEvent.contextMenu(handle);
  const panel = screen.getByRole('dialog', { name: 'Dock 설정' });
  const slider = within(panel).getByRole('slider', { name: 'Dock 크기' });
  slider.getBoundingClientRect = () => new DOMRect(100, 100, 320, 50);
  capture(slider);
  return { ...view, dock, handle, panel, slider };
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
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('turns both existing separators into controls inside the Dock', () => {
  render(site());
  const handles = screen.getAllByRole('slider', { name: 'Dock 크기 조절' });
  expect(handles).toHaveLength(2);
  expect(screen.queryByRole('slider', { name: 'Resize Dock' })).toBeNull();
  handles.forEach(handle => {
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    expect(handle.getAttribute('aria-valuenow')).toBe('40');
    expect(handle.closest('[data-dock-rail]')).not.toBeNull();
    expect(handle.getAttribute('aria-haspopup')).toBe('dialog');
  });
  fireEvent.keyDown(handles[1], { key: 'F10', shiftKey: true });
  expect(screen.getAllByRole('dialog', { name: 'Dock 설정' })).toHaveLength(1);
});

test('saves once on release, synchronizes both separators and isolates the demo', () => {
  render(
    <>
      {site()}
      <DockDemo />
    </>
  );
  const actual = within(
    screen.getByRole('group', { name: '사이트 탐색 Dock' })
  ).getAllByRole('slider', { name: 'Dock 크기 조절' });
  const demo = within(
    screen.getByRole('group', { name: 'Craft Dock 데모' })
  ).getByRole('slider', { name: 'Dock 크기 조절' });
  capture(actual[0]);
  const writes = vi.spyOn(Storage.prototype, 'setItem');
  emit(actual[0], 'pointerdown');
  emit(actual[0], 'pointermove', { y: 176 });
  tick();
  actual.forEach(handle =>
    expect(handle.getAttribute('aria-valuenow')).toBe('52')
  );
  expect(useDockPreferences.getState().size).toBe(40);
  expect(writes).not.toHaveBeenCalled();
  emit(actual[0], 'pointerup', { y: 176 });
  expect(writes).toHaveBeenCalledOnce();
  expect(useDockPreferences.getState().size).toBe(52);
  fireEvent.keyDown(demo, { key: 'End' });
  expect(demo.getAttribute('aria-valuenow')).toBe('64');
  expect(actual[0].getAttribute('aria-valuenow')).toBe('52');
  expect(writes).toHaveBeenCalledOnce();
});

test('keeps explicit resize available in reduced motion and restores on unmount', () => {
  preference.reduced = true;
  const commit = vi.fn();
  const { unmount } = render(
    <DockSurface size={40} onSizeChange={commit}>
      <DockSeparator />
    </DockSurface>
  );
  const handle = screen.getByRole('slider', { name: 'Dock 크기 조절' });
  capture(handle);
  emit(handle, 'pointerdown');
  emit(handle, 'pointermove', { y: 180 });
  tick();
  expect(handle.getAttribute('aria-valuenow')).toBe('50');
  unmount();
  expect(commit).not.toHaveBeenCalled();
  expect(document.documentElement.style.cursor).toBe('');
  expect(document.documentElement.style.userSelect).toBe('');
  expect(frames.size).toBe(0);
});

test('previews size on hover without saving or moving the settings panel, then restores', () => {
  const { dock, handle, panel, slider } = openSettings();
  const writes = vi.spyOn(Storage.prototype, 'setItem');
  const left = panel.style.left;
  const top = panel.style.top;
  emit(slider, 'pointermove', { x: 340 });
  expect(dock.style.getPropertyValue('--dock-size')).toBe('56px');
  expect(handle.getAttribute('aria-valuenow')).toBe('56');
  expect(writes).not.toHaveBeenCalled();
  expect(useDockPreferences.getState().size).toBe(40);
  expect(panel.style.left).toBe(left);
  expect(panel.style.top).toBe(top);
  emit(slider, 'pointerout', { x: 450 });
  expect(dock.style.getPropertyValue('--dock-size')).toBe('40px');
  expect(writes).not.toHaveBeenCalled();
});

test('commits the last captured slider value once and restores that value after later hover', () => {
  const { dock, slider } = openSettings();
  const writes = vi.spyOn(Storage.prototype, 'setItem');
  emit(slider, 'pointerdown', { x: 300 });
  emit(slider, 'pointermove', { x: 380 });
  expect(dock.style.getPropertyValue('--dock-size')).toBe('60px');
  expect(writes).not.toHaveBeenCalled();
  emit(slider, 'pointerup', { x: 400 });
  expect(useDockPreferences.getState().size).toBe(62);
  expect(writes).toHaveBeenCalledOnce();
  emit(slider, 'pointermove', { x: 100 });
  expect(dock.style.getPropertyValue('--dock-size')).toBe('32px');
  emit(slider, 'pointerout', { x: 50 });
  expect(dock.style.getPropertyValue('--dock-size')).toBe('62px');
  expect(writes).toHaveBeenCalledOnce();
});

test.each(['pointercancel', 'lostpointercapture', 'blur', 'Escape'])(
  'cancels an uncommitted slider change on %s',
  reason => {
    const { dock, slider, handle } = openSettings();
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    emit(slider, 'pointerdown', { x: 420 });
    expect(dock.style.getPropertyValue('--dock-size')).toBe('64px');
    if (reason === 'blur') {
      fireEvent.blur(window);
    } else if (reason === 'Escape') {
      fireEvent.keyDown(slider, { key: 'Escape' });
    } else {
      emit(slider, reason);
    }
    expect(dock.style.getPropertyValue('--dock-size')).toBe('40px');
    expect(writes).not.toHaveBeenCalled();
    if (reason === 'Escape') {
      expect(document.activeElement).toBe(handle);
      expect(dock.dataset.dockSettings).toBe('false');
    }
  }
);

test('adjusts magnification separately by keyboard and does not change the base size', () => {
  const { dock, panel } = openSettings();
  const slider = within(panel).getByRole('slider', { name: '아이콘 확대' });
  fireEvent.change(slider, { target: { value: '1.85' } });
  expect(useDockPreferences.getState()).toMatchObject({
    size: 40,
    magnification: 1.85,
  });
  expect(dock.style.getPropertyValue('--dock-size')).toBe('40px');
  fireEvent.pointerDown(document.body);
  expect(dock.dataset.dockSettings).toBe('false');
});

test('leaves the resize badge to its driver across React layout updates', () => {
  const content = (
    <DockSurface size={40} onSizeChange={vi.fn()}>
      <DockSeparator />
    </DockSurface>
  );
  const server = document.createElement('div');
  server.innerHTML = renderToStaticMarkup(content);
  expect(
    server.querySelector('[data-dock-size-output]')?.childNodes.length
  ).toBe(0);
  const { rerender, unmount } = render(content);
  const handle = screen.getByRole('slider', { name: 'Dock 크기 조절' });
  capture(handle);
  emit(handle, 'pointerdown');
  emit(handle, 'pointermove', { y: 176 });
  tick();
  const badge = handle.querySelector('[data-dock-size-output]');
  expect(badge?.textContent).toBe('52px');
  rerender(
    <DockSurface size={40} onSizeChange={vi.fn()} label="Changed">
      <DockSeparator />
      <button>Home</button>
    </DockSurface>
  );
  expect(badge?.textContent).toBe('52px');
  unmount();
  expect(document.documentElement.style.cursor).toBe('');
});

test('resumes pointer preview after a keyboard commit at the same pointer position', () => {
  const { dock, slider } = openSettings();
  emit(slider, 'pointermove', { x: 340 });
  expect(dock.style.getPropertyValue('--dock-size')).toBe('56px');
  fireEvent.change(slider, { target: { value: '55' } });
  expect(dock.style.getPropertyValue('--dock-size')).toBe('55px');
  emit(slider, 'pointermove', { x: 340 });
  expect(dock.style.getPropertyValue('--dock-size')).toBe('56px');
  emit(slider, 'pointerout', { x: 50 });
  expect(dock.style.getPropertyValue('--dock-size')).toBe('55px');
});
