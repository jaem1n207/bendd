import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NavigationItemTooltip } from '@/components/navigation/ui/navigation-item-tooltip';

const state = vi.hoisted(() => {
  const preference: { reducedMotion: boolean | undefined } = {
    reducedMotion: false,
  };
  return {
    ...preference,
    play: vi.fn(),
    stop: vi.fn(),
    start: vi.fn(
      (
        value: { get: () => number; set: (value: number) => void },
        frames: number[],
        options: object
      ) => ({ value, frames, options, stop: () => state.stop() })
    ),
  };
});
vi.mock('motion/react', async importOriginal => ({
  ...(await importOriginal<typeof import('motion/react')>()),
  animate: state.start,
}));
vi.mock('@/hooks/use-prefers-reduced-motion', () => ({
  usePrefersReducedMotion: () => state.reducedMotion,
}));
vi.mock('@/components/sound', () => ({ useSoundStore: () => true }));
vi.mock('use-sound', () => ({ default: () => [state.play] }));
function renderItem(name = 'Home') {
  const view = render(
    <NavigationItemTooltip name={name}>
      <button>{name}</button>
    </NavigationItemTooltip>
  );
  return { ...view, button: screen.getByRole('button', { name }) };
}
describe('navigation click bounce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.reducedMotion = false;
  });
  it('runs a single 260ms hop on the inner body, proportional to base size', () => {
    const { button } = renderItem();
    const item = button.closest('[data-navigation-item]');
    if (!item) {
      throw new Error('Dock item missing');
    }
    Object.defineProperty(item, 'offsetWidth', { value: 64 });
    fireEvent.click(button, { detail: 1 });
    expect(state.start).toHaveBeenCalledWith(
      expect.anything(),
      [0, -9.6, 0],
      expect.objectContaining({ duration: 0.26, times: [0, 0.08 / 0.26, 1] })
    );
    expect(state.play).toHaveBeenCalledOnce();
  });
  it('interrupts rapid clicks from the current position instead of queuing or resetting', () => {
    const { button } = renderItem();
    fireEvent.click(button, { detail: 1 });
    const value = state.start.mock.calls[0][0];
    act(() => value.set(-2));
    fireEvent.click(button, { detail: 1 });
    expect(state.stop).toHaveBeenCalledOnce();
    expect(state.start).toHaveBeenLastCalledWith(
      value,
      [-2, -6, 0],
      expect.anything()
    );
  });
  it.each([true, undefined])(
    'keeps preference %s still without silencing activation',
    preference => {
      state.reducedMotion = preference;
      const { button } = renderItem();
      fireEvent.click(button, { detail: 1 });
      expect(state.start).not.toHaveBeenCalled();
      expect(state.play).toHaveBeenCalledOnce();
    }
  );
  it('stops travel on keyboard input and preserves sound-toggle exclusion', () => {
    const { button } = renderItem('Toggle sound');
    fireEvent.click(button, { detail: 1 });
    const value = state.start.mock.calls[0][0];
    act(() => value.set(-3));
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.click(button, { detail: 0 });
    expect(value.get()).toBe(0);
    expect(state.start).toHaveBeenCalledOnce();
    expect(state.play).not.toHaveBeenCalled();
  });
  it('cleans motion on blur, preference change and unmount', () => {
    const { button, rerender, unmount } = renderItem();
    fireEvent.click(button, { detail: 1 });
    const value = state.start.mock.calls[0][0];
    act(() => value.set(-3));
    fireEvent.blur(window);
    expect(value.get()).toBe(0);
    fireEvent.click(button, { detail: 1 });
    state.reducedMotion = true;
    rerender(
      <NavigationItemTooltip name="Home">
        <button>Home</button>
      </NavigationItemTooltip>
    );
    expect(value.get()).toBe(0);
    const before = state.stop.mock.calls.length;
    unmount();
    expect(state.stop.mock.calls.length).toBeGreaterThan(before);
  });
});
