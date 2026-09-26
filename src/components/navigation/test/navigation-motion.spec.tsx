import { act, renderHook } from '@testing-library/react';
import { motionValue } from 'motion/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useNavigationItemAnimation } from '@/components/navigation/model/use-navigation-item-animation';

const state = vi.hoisted(() => {
  const preference: { reducedMotion: boolean | undefined } = {
    reducedMotion: false,
  };
  return {
    ...preference,
    play: vi.fn(),
    controls: {
      start: vi.fn(() => Promise.resolve()),
      stop: vi.fn(),
      set: vi.fn(),
    },
  };
});
vi.mock('motion/react', async importOriginal => ({
  ...(await importOriginal<typeof import('motion/react')>()),
  useAnimation: () => state.controls,
}));
vi.mock('@/hooks/use-prefers-reduced-motion', () => ({
  usePrefersReducedMotion: () => state.reducedMotion,
}));
vi.mock('@/components/sound', () => ({
  useSoundStore: () => true,
}));
vi.mock('use-sound', () => ({ default: () => [state.play] }));

function useItem(name = 'Home') {
  return useNavigationItemAnimation({
    name,
    size: 40,
    bounds: { x: 0, width: 40 },
    mousex: motionValue(Infinity),
  });
}

describe('navigation motion preference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.reducedMotion = false;
    state.controls.start.mockImplementation(() => Promise.resolve());
  });

  it.each([true, undefined])(
    'keeps sound but skips movement for %s',
    async preference => {
      state.reducedMotion = preference;
      const { result } = renderHook(() => useItem());
      expect(result.current.allowMotion).toBe(false);
      await act(() => result.current.handleClick());
      expect(state.play).toHaveBeenCalledOnce();
      expect(state.controls.start).not.toHaveBeenCalled();
      expect(state.controls.set).toHaveBeenCalledWith({ top: 0 });
    }
  );

  it('preserves the normal bounce and sound-switch exclusion', async () => {
    const { result } = renderHook(() => useItem('Toggle sound'));
    expect(result.current.allowMotion).toBe(true);
    await act(() => result.current.handleClick());
    expect(state.controls.start.mock.calls).toEqual([
      [{ top: -20 }],
      [{ top: 0 }],
    ]);
    expect(state.play).not.toHaveBeenCalled();
  });

  it('invalidates a pending bounce when the preference changes', async () => {
    let finish = () => {};
    state.controls.start.mockReturnValueOnce(
      new Promise<void>(resolve => {
        finish = resolve;
      })
    );
    const { result, rerender } = renderHook(() => useItem());
    const pending = result.current.handleClick();
    state.reducedMotion = true;
    rerender();
    expect(state.controls.stop).toHaveBeenCalled();
    expect(state.controls.set).toHaveBeenCalledWith({ top: 0 });
    state.reducedMotion = false;
    rerender();
    await act(async () => {
      finish();
      await pending;
    });
    expect(state.controls.start).toHaveBeenCalledTimes(1);
  });

  it('only lets the newest of three taps finish', async () => {
    const finishes: (() => void)[] = [];
    state.controls.start.mockImplementation(
      () => new Promise<void>(resolve => finishes.push(resolve))
    );
    const { result } = renderHook(() => useItem());
    const pending = [
      result.current.handleClick(),
      result.current.handleClick(),
      result.current.handleClick(),
    ];
    await act(async () => {
      finishes.slice().forEach(finish => finish());
      await Promise.all(pending);
    });
    expect(state.controls.start).toHaveBeenCalledTimes(4);
    expect(state.controls.start).toHaveBeenLastCalledWith({ top: 0 });
  });

  it('does not restart a bounce after unmount', async () => {
    let finish = () => {};
    state.controls.start.mockReturnValueOnce(
      new Promise<void>(resolve => {
        finish = resolve;
      })
    );
    const { result, unmount } = renderHook(() => useItem());
    const pending = result.current.handleClick();
    unmount();
    await act(async () => {
      finish();
      await pending;
    });
    expect(state.controls.start).toHaveBeenCalledTimes(1);
  });

  it('waits for a fresh pointer movement before exposing the spring again', () => {
    const mousex = motionValue(Infinity);
    const { result, rerender } = renderHook(() =>
      useNavigationItemAnimation({
        name: 'Home',
        size: 40,
        bounds: { x: 0, width: 40 },
        mousex,
      })
    );
    act(() => mousex.set(20));
    expect(result.current.width).not.toBe(40);
    state.reducedMotion = true;
    rerender();
    act(() => mousex.set(Infinity));
    state.reducedMotion = false;
    rerender();
    expect(result.current.width).toBe(40);
    act(() => mousex.set(21));
    expect(result.current.width).not.toBe(40);
  });
});
