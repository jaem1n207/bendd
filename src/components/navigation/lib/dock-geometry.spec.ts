import { describe, expect, test } from 'vitest';

import {
  readDockPreferences,
  stepDockSpring,
} from '@/components/navigation/lib/dock-geometry';

describe('dock geometry', () => {
  test('retains bounded legacy size and ignores obsolete magnification', () => {
    expect(readDockPreferences({ size: -50, magnification: 500 })).toEqual({
      size: 32,
    });
    expect(
      readDockPreferences({ size: Infinity, magnification: 'large' })
    ).toEqual({ size: 40 });
    expect(readDockPreferences({ size: 52.25, magnification: 80 })).toEqual({
      size: 52.25,
    });
    expect(readDockPreferences(null)).toEqual({ size: 40 });
  });

  test('settles monotonically and gives the same result at different frame rates', () => {
    let state = { value: 0, velocity: 0 };
    for (let i = 0; i < 60; i += 1) {
      const next = stepDockSpring(state.value, state.velocity, 40, 1 / 60);
      expect(next.value).toBeGreaterThanOrEqual(state.value);
      expect(next.value).toBeLessThanOrEqual(40);
      state = next;
    }
    expect(state.value).toBeCloseTo(40);
    const oneFrame = stepDockSpring(15, 30, 0, 1 / 30);
    const halfFrame = stepDockSpring(15, 30, 0, 1 / 60);
    const twoFrames = stepDockSpring(
      halfFrame.value,
      halfFrame.velocity,
      0,
      1 / 60
    );
    expect(twoFrames.value).toBeCloseTo(oneFrame.value, 10);
    expect(twoFrames.velocity).toBeCloseTo(oneFrame.velocity, 10);
  });
});
