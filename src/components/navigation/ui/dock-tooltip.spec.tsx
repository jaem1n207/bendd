import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { DockInput, DockMotionMode } from '@/components/navigation/consts/dock';
import { DockTooltip } from '@/components/navigation/ui/dock-tooltip';

const state = {
  name: 'Home',
  index: 0,
  direction: 1,
  input: DockInput.Pointer,
};

describe('shared Dock tooltip', () => {
  test('retains the same bubble when changing labels and reversing direction', () => {
    const { rerender } = render(
      <DockTooltip id="test-tip" state={state} mode={DockMotionMode.Animated} />
    );
    const bubble = screen.getByRole('tooltip');
    rerender(
      <DockTooltip
        id="test-tip"
        state={{ ...state, name: 'Craft', index: 1 }}
        mode={DockMotionMode.Animated}
      />
    );
    expect(screen.getByRole('tooltip')).toBe(bubble);
    expect(bubble.querySelector('.sr-only')?.textContent).toBe('Craft');
    rerender(
      <DockTooltip
        id="test-tip"
        state={{ ...state, direction: -1 }}
        mode={DockMotionMode.Animated}
      />
    );
    expect(screen.getByRole('tooltip')).toBe(bubble);
    expect(bubble.dataset.tooltipDirection).toBe('-1');
  });

  test('removes outgoing label animations immediately for keyboard input', () => {
    const { rerender } = render(
      <DockTooltip id="test-tip" state={state} mode={DockMotionMode.Animated} />
    );
    rerender(
      <DockTooltip
        id="test-tip"
        state={{ ...state, name: 'Craft', input: DockInput.Keyboard }}
        mode={DockMotionMode.Animated}
      />
    );
    const bubble = screen.getByRole('tooltip');
    expect(bubble.textContent).not.toContain('Home');
    expect(
      bubble
        .querySelector('[aria-hidden]')
        ?.lastElementChild?.getAttribute('style')
    ).toBeNull();
  });
});
