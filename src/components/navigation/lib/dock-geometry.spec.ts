import { describe, expect, test } from 'vitest';

import {
  getDockOffsets,
  getDockTargets,
  readDockPreferences,
  stepDockSpring,
} from '@/components/navigation/lib/dock-geometry';

const centers = [20, 68, 116, 164, 212];
const setup = {
  centers,
  size: 40,
  magnification: 80,
  pointer: 116,
  budget: 400,
};

describe('dock geometry', () => {
  test('magnifies the pointed item and its neighbors with a symmetric falloff', () => {
    const growth = getDockTargets(setup);
    expect(growth[2]).toBe(40);
    expect(growth[1]).toBeGreaterThan(growth[0]);
    expect(growth[0]).toBeCloseTo(growth[4]);
    expect(growth[1]).toBeCloseTo(growth[3]);
  });

  test('keeps the center and spacing stable as icons expand', () => {
    const growth = getDockTargets({ ...setup, pointer: 68 });
    const offsets = getDockOffsets(growth);
    for (let i = 1; i < centers.length; i += 1) {
      const previousRight =
        centers[i - 1] + offsets[i - 1] + (40 + growth[i - 1]) / 2;
      const nextLeft = centers[i] + offsets[i] - (40 + growth[i]) / 2;
      expect(nextLeft - previousRight).toBeCloseTo(8);
    }
    const left = centers[0] + offsets[0] - (40 + growth[0]) / 2;
    const right = centers[4] + offsets[4] + (40 + growth[4]) / 2;
    expect((left + right) / 2).toBeCloseTo(116);
  });

  test('fits all expansion inside the available viewport budget', () => {
    const growth = getDockTargets({ ...setup, budget: 20 });
    expect(growth.reduce((sum, value) => sum + value, 0)).toBeCloseTo(20);
    expect(getDockTargets({ ...setup, budget: -1 })).toEqual([0, 0, 0, 0, 0]);
    expect(getDockTargets({ ...setup, pointer: null })).toEqual([
      0, 0, 0, 0, 0,
    ]);
  });

  test('validates persisted limits and rejects malformed values', () => {
    expect(readDockPreferences({ size: -50, magnification: 500 })).toEqual({
      size: 32,
      magnification: 112,
    });
    expect(
      readDockPreferences({ size: Infinity, magnification: 'large' })
    ).toEqual({ size: 40, magnification: 80 });
    expect(readDockPreferences(null)).toEqual({ size: 40, magnification: 80 });
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
