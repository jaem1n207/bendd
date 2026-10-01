import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createDockResize } from '@/components/navigation/lib/dock-resize';

function emit(
  target: EventTarget,
  type: string,
  options: {
    y?: number;
    x?: number;
    id?: number;
    button?: number;
    primary?: boolean;
    pointerType?: string;
  } = {}
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientY: options.y ?? 200,
    clientX: options.x ?? 0,
    button: options.button ?? 0,
  });
  Object.defineProperties(event, {
    pointerId: { value: options.id ?? 1 },
    isPrimary: { value: options.primary ?? true },
    pointerType: { value: options.pointerType ?? 'mouse' },
  });
  target.dispatchEvent(event);
  return event;
}
function fixture(size = 40) {
  const root = document.createElement('div');
  const handle = document.createElement('button');
  const output = document.createElement('span');
  output.dataset.dockSizeOutput = '';
  root.append(handle, output);
  document.body.append(root);
  const captures = new Set<number>();
  handle.setPointerCapture = vi.fn(id => captures.add(id));
  handle.hasPointerCapture = id => captures.has(id);
  handle.releasePointerCapture = vi.fn(id => {
    captures.delete(id);
    emit(handle, 'lostpointercapture', { id });
  });
  const commit = vi.fn();
  const driver = createDockResize({ root, handle, size, onCommit: commit });
  const value = () => Number(handle.getAttribute('aria-valuenow'));
  return { root, handle, output, captures, commit, value, ...driver };
}

describe('Dock resize direct manipulation', () => {
  let frames: Map<number, FrameRequestCallback>;
  let next: number;
  const tick = () => {
    const batch = [...frames.values()];
    frames.clear();
    batch.forEach(callback => callback(0));
  };
  beforeEach(() => {
    frames = new Map();
    next = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++next, callback);
      return next;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    document.documentElement.style.cursor = 'crosshair';
    document.documentElement.style.userSelect = 'text';
  });
  afterEach(() => {
    document.body.replaceChildren();
    document.documentElement.removeAttribute('style');
    vi.unstubAllGlobals();
  });
  test('tracks only vertical displacement once per frame, reverses and commits once on release', () => {
    const dock = fixture();
    emit(dock.handle, 'pointerdown');
    emit(dock.handle, 'pointermove', { y: 190 });
    emit(dock.handle, 'pointermove', { y: 176, x: 500 });
    expect(frames.size).toBe(1);
    expect(dock.value()).toBe(40);
    tick();
    expect(dock.value()).toBe(52);
    expect(dock.root.style.getPropertyValue('--dock-size')).toBe('52px');
    expect(dock.commit).not.toHaveBeenCalled();
    emit(dock.handle, 'pointermove', { y: 200, x: 600 });
    tick();
    expect(dock.value()).toBe(40);
    emit(dock.handle, 'pointermove', { y: 175 });
    emit(dock.handle, 'pointerup', { y: 173 });
    expect(dock.value()).toBe(53.5);
    expect(dock.commit).toHaveBeenCalledExactlyOnceWith(53.5);
    expect(frames.size).toBe(0);
    expect(dock.captures.size).toBe(0);
    expect(document.documentElement.style.cursor).toBe('crosshair');
    expect(document.documentElement.style.userSelect).toBe('text');
    emit(dock.handle, 'pointermove', { y: 100 });
    tick();
    expect(dock.value()).toBe(53.5);
    emit(dock.handle, 'pointerdown', { y: 173 });
    emit(dock.handle, 'pointerup', { y: 169 });
    expect(dock.value()).toBe(55.5);
    dock.dispose();
  });
  test('does not save an unmoved click and rejects secondary pointers or buttons', () => {
    const dock = fixture();
    emit(dock.handle, 'pointerdown', { button: 2 });
    emit(dock.handle, 'pointerdown', { primary: false });
    expect(dock.captures.size).toBe(0);
    emit(dock.handle, 'pointerdown');
    emit(dock.handle, 'pointermove', { y: 100, id: 2 });
    emit(dock.handle, 'pointerup', { y: 100, id: 2 });
    expect(dock.value()).toBe(40);
    expect(dock.captures.size).toBe(1);
    emit(dock.handle, 'pointerup');
    expect(dock.commit).not.toHaveBeenCalled();
    dock.dispose();
  });
  test.each([
    'pointercancel',
    'lostpointercapture',
    'Escape',
    'blur',
    'unmount',
  ])('restores the start size and cleans pending work on %s', reason => {
    const dock = fixture(48);
    emit(dock.handle, 'pointerdown');
    emit(dock.handle, 'pointermove', { y: 180 });
    tick();
    emit(dock.handle, 'pointermove', { y: 170 });
    expect(dock.value()).toBe(58);
    if (reason === 'Escape') {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
    } else if (reason === 'blur') {
      window.dispatchEvent(new Event('blur'));
    } else if (reason === 'unmount') {
      dock.dispose();
    } else {
      emit(dock.handle, reason);
    }
    window.dispatchEvent(new Event('blur'));
    expect(dock.value()).toBe(48);
    expect(dock.commit).not.toHaveBeenCalled();
    expect(dock.captures.size).toBe(0);
    expect(frames.size).toBe(0);
    expect(document.documentElement.style.cursor).toBe('crosshair');
    expect(document.documentElement.style.userSelect).toBe('text');
    dock.dispose();
  });
  test.each(['touch', 'pen'])(
    'supports %s capture, clamps limits and returns from an edge',
    pointerType => {
      const dock = fixture();
      emit(dock.handle, 'pointerdown', { pointerType });
      emit(dock.handle, 'pointermove', { y: -100 });
      tick();
      expect(dock.value()).toBe(64);
      emit(dock.handle, 'pointermove', { y: 200 });
      tick();
      expect(dock.value()).toBe(40);
      emit(dock.handle, 'pointerup', { y: 400 });
      expect(dock.value()).toBe(32);
      expect(dock.commit).toHaveBeenCalledExactlyOnceWith(32);
      dock.dispose();
    }
  );
  test('supports keyboard limits, steps and reset without starting a drag', () => {
    const dock = fixture();
    const cases = [
      ['ArrowUp', 41],
      ['ArrowRight', 42],
      ['ArrowDown', 41],
      ['ArrowLeft', 40],
      ['Home', 32],
      ['End', 64],
      ['Enter', 40],
    ];
    for (const [key, expected] of cases) {
      const event = new KeyboardEvent('keydown', {
        key: String(key),
        bubbles: true,
        cancelable: true,
      });
      dock.handle.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(dock.value()).toBe(expected);
      expect(dock.commit).toHaveBeenLastCalledWith(expected);
    }
    expect(dock.captures.size).toBe(0);
    expect(frames.size).toBe(0);
    dock.dispose();
  });
});
