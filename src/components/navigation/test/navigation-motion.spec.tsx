import { act, renderHook } from '@testing-library/react';
import { DockInput } from '@/components/navigation/consts/dock';
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
      expect(state.controls.set).toHaveBeenCalledWith({ y: 0 });
    }
  );

  it('preserves the normal bounce and sound-switch exclusion', async () => {
    const { result } = renderHook(() => useItem('Toggle sound'));
    expect(result.current.allowMotion).toBe(true);
    await act(() => result.current.handleClick());
    expect(state.controls.start.mock.calls).toEqual([[{ y: -20 }], [{ y: 0 }]]);
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
    expect(state.controls.set).toHaveBeenCalledWith({ y: 0 });
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
    expect(state.controls.start).toHaveBeenLastCalledWith({ y: 0 });
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

  it('keeps keyboard activation still without disabling sound', async () => {
    const { result } = renderHook(() => useItem());
    await act(() => result.current.handleClick(DockInput.Keyboard));
    expect(state.controls.start).not.toHaveBeenCalled();
    expect(state.controls.set).toHaveBeenCalledWith({ y: 0 });
    expect(state.play).toHaveBeenCalledOnce();
  });
});
