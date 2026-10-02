import { describe, expect, test } from 'vitest';

import {
  readDockPreferences,
  getDockTargets,
  getDockOffsets,
  stepDockSpring,
} from '@/components/navigation/lib/dock-geometry';

describe('dock geometry', () => {
  test('bounds size and proportional magnification independently', () => {
    expect(readDockPreferences({ size: -50, magnification: 500 })).toEqual({
      size: 32,
      magnification: 2,
    });
    expect(
      readDockPreferences({ size: Infinity, magnification: 'large' })
    ).toEqual({ size: 40, magnification: 1.6 });
    expect(readDockPreferences({ size: 52.25, magnification: 80 })).toEqual({
      size: 52.25,
      magnification: 2,
    });
    expect(readDockPreferences(null)).toEqual({ size: 40, magnification: 1.6 });
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

test('scales peak magnification with size and preserves the centered width budget', () => {
  for (const size of [32, 40, 64]) {
    const growth = getDockTargets({
      centers: [0, size, size * 2],
      size,
      magnification: 1.6,
      pointer: size,
      budget: 1000,
    });
    expect(growth[1]).toBeCloseTo(size * 0.6);
    const offsets = getDockOffsets(growth);
    expect(offsets[0]).toBeCloseTo(-offsets[2]);
    const constrained = getDockTargets({
      centers: [0, size, size * 2],
      size,
      magnification: 2,
      pointer: size,
      budget: 10,
    });
    expect(constrained.reduce((sum, value) => sum + value, 0)).toBeCloseTo(10);
  }
  expect(
    getDockTargets({
      centers: [0],
      size: 40,
      magnification: 1,
      pointer: 0,
      budget: 100,
    })
  ).toEqual([0]);
});
