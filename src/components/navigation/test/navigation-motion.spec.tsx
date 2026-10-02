import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NavigationItemTooltip } from '@/components/navigation/ui/navigation-item-tooltip';

const state = vi.hoisted(() => ({
  play: vi.fn(),
  animate: vi.fn(() => ({ stop: vi.fn() })),
}));
vi.mock('motion/react', async importOriginal => ({
  ...(await importOriginal<typeof import('motion/react')>()),
  animate: state.animate,
}));
vi.mock('@/hooks/use-prefers-reduced-motion', () => ({
  usePrefersReducedMotion: () => false,
}));
vi.mock('@/components/sound', () => ({ useSoundStore: () => true }));
vi.mock('use-sound', () => ({ default: () => [state.play] }));

function renderItem(name = 'Home') {
  const activate = vi.fn();
  const view = render(
    <NavigationItemTooltip name={name}>
      <button onClick={activate}>{name}</button>
    </NavigationItemTooltip>
  );
  return { ...view, activate, button: screen.getByRole('button', { name }) };
}

describe('navigation activation without click travel', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([1, 0])(
    'activates immediately with sound and no bounce for click detail %i',
    detail => {
      const { button, activate } = renderItem();
      fireEvent.click(button, { detail });
      expect(activate).toHaveBeenCalledOnce();
      expect(state.play).toHaveBeenCalledOnce();
      expect(state.animate).not.toHaveBeenCalled();
    }
  );

  it('keeps rapid clicks immediate without starting or queueing a bounce', () => {
    const { button, activate } = renderItem();
    fireEvent.click(button, { detail: 1 });
    fireEvent.click(button, { detail: 1 });
    expect(activate).toHaveBeenCalledTimes(2);
    expect(state.play).toHaveBeenCalledTimes(2);
    expect(state.animate).not.toHaveBeenCalled();
  });

  it('leaves the sound toggle to play its own feedback without click travel', () => {
    const { button, activate } = renderItem('Toggle sound');
    fireEvent.click(button, { detail: 1 });
    expect(activate).toHaveBeenCalledOnce();
    expect(state.play).not.toHaveBeenCalled();
    expect(state.animate).not.toHaveBeenCalled();
  });
});
