import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NavigationItemTooltip } from '@/components/navigation/ui/navigation-item-tooltip';

const state = vi.hoisted(() => {
  const preference: { reducedMotion: boolean | undefined } = {
    reducedMotion: false,
  };
  return { ...preference, play: vi.fn(), start: vi.fn() };
});
vi.mock('motion/react', async importOriginal => ({
  ...(await importOriginal<typeof import('motion/react')>()),
  useAnimation: () => ({ start: state.start, stop: vi.fn(), set: vi.fn() }),
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
  const button = screen.getByRole('button', { name });
  const body = button.parentElement;
  if (!body) {
    throw new Error('Missing item body');
  }
  return { ...view, button, body };
}
function pointer(target: EventTarget, type: string, pointerId = 1) {
  const event = new MouseEvent(type, { bubbles: true, button: 0 });
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    isPrimary: { value: true },
    pointerType: { value: 'mouse' },
  });
  act(() => target.dispatchEvent(event));
}

describe('navigation press feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.reducedMotion = false;
  });
  it('compresses only the inner body while held and never queues vertical travel', () => {
    const { button, body } = renderItem();
    pointer(button, 'pointerdown');
    expect(body.style.transform).toBe('scale(0.97)');
    expect(body.style.transition).toContain('150ms');
    expect(body.parentElement?.style.transform).toBe('');
    pointer(document, 'pointerup');
    expect(body.style.transform).toBe('none');
    expect(body.style.transition).toContain('100ms');
    fireEvent.click(button);
    expect(state.start).not.toHaveBeenCalled();
    expect(state.play).toHaveBeenCalledOnce();
  });
  it('reverses rapid presses and ignores releases from another pointer', () => {
    const { button, body } = renderItem();
    for (let i = 0; i < 3; i += 1) {
      pointer(button, 'pointerdown');
      pointer(document, 'pointerup', 2);
      expect(body.style.transform).toBe('scale(0.97)');
      pointer(document, 'pointerup');
      expect(body.style.transform).toBe('none');
    }
    expect(state.start).not.toHaveBeenCalled();
  });
  it.each([true, undefined])(
    'keeps %s motion preference static without silencing clicks',
    preference => {
      state.reducedMotion = preference;
      const { button, body } = renderItem();
      pointer(button, 'pointerdown');
      expect(body.style.transform).toBe('none');
      expect(body.style.transition).toBe('none');
      fireEvent.click(button);
      expect(state.play).toHaveBeenCalledOnce();
    }
  );
  it('switches to still keyboard feedback immediately and preserves sound-switch exclusion', () => {
    const { button, body } = renderItem('Toggle sound');
    pointer(button, 'pointerdown');
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(body.style.transform).toBe('none');
    expect(body.style.transition).toBe('none');
    fireEvent.click(button, { detail: 0 });
    expect(state.play).not.toHaveBeenCalled();
  });
  it('clears a press on cancellation, blur, preference change and unmount', () => {
    const { button, body, rerender, unmount } = renderItem();
    pointer(button, 'pointerdown');
    pointer(document, 'pointercancel');
    expect(body.style.transform).toBe('none');
    pointer(button, 'pointerdown');
    fireEvent.blur(window);
    expect(body.style.transform).toBe('none');
    pointer(button, 'pointerdown');
    state.reducedMotion = true;
    rerender(
      <NavigationItemTooltip name="Home">
        <button>Home</button>
      </NavigationItemTooltip>
    );
    expect(body.style.transform).toBe('none');
    unmount();
    pointer(document, 'pointerup');
    expect(state.start).not.toHaveBeenCalled();
  });
});
