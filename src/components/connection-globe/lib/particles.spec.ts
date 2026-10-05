/* eslint-disable playwright/no-standalone-expect -- Vitest shares the project's .spec.ts glob. */
import { describe, expect, it } from 'vitest';

import {
  continentColor,
  createLandParticles,
} from '@/components/connection-globe/lib/particles';

describe('globe land particles', () => {
  it('keeps water empty and samples land at stable unit-sphere positions', () => {
    expect(
      createLandParticles(
        { width: 1, height: 1, data: new Uint8ClampedArray([0, 0, 0, 255]) },
        100
      )
    ).toHaveLength(0);
    const mask = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([255, 255, 255, 255]),
    };
    const particles = createLandParticles(mask, 100);
    expect(particles).toEqual(createLandParticles(mask, 100));
    expect(particles).toHaveLength(500);
    for (let index = 0; index < particles.length; index += 5) {
      expect(
        Math.hypot(particles[index], particles[index + 1], particles[index + 2])
      ).toBeCloseTo(1);
      expect(particles[index + 4]).toBeGreaterThanOrEqual(0);
      expect(particles[index + 4]).toBeLessThan(1);
    }
  });
  it('reads northern land from the top of the mask instead of mirroring the map', () => {
    const particles = createLandParticles(
      {
        width: 1,
        height: 2,
        data: new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]),
      },
      100
    );
    expect(particles.length).toBeGreaterThan(0);
    for (let index = 1; index < particles.length; index += 5) {
      expect(particles[index]).toBeGreaterThan(0);
    }
  });
  it('gives representative continents distinct, deterministic color groups', () => {
    const regions = [
      [37, -122],
      [-23, -46],
      [-1, 36],
      [49, 2],
      [37, 127],
      [-34, 151],
      [-80, 0],
    ];
    expect(
      new Set(regions.map(([lat, lon]) => continentColor(lat, lon))).size
    ).toBe(7);
  });
});
