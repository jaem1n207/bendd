/* eslint-disable playwright/no-standalone-expect -- Vitest shares the project's .spec.ts glob. */
import { describe, expect, it, test } from 'vitest';

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
    expect(particles).toHaveLength(600);
    for (let index = 0; index < particles.length; index += 6) {
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
    for (let index = 1; index < particles.length; index += 6) {
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

const mask = {
  width: 32,
  height: 16,
  data: new Uint8ClampedArray(32 * 16 * 4).fill(255),
};

describe('continental color regions', () => {
  test.each([
    ['New York', 40.7, -74, 0],
    ['Panama City', 9, -79.5, 0],
    ['Caracas', 10.5, -66.9, 1],
    ['Bogota', 4.7, -74.1, 1],
    ['London', 51.5, -0.1, 3],
    ['Athens', 38, 23.7, 3],
    ['Moscow', 55.8, 37.6, 3],
    ['Tunis', 36.8, 10.2, 2],
    ['Addis Ababa', 9, 38.7, 2],
    ['Mogadishu', 2.1, 45.3, 2],
    ['Madagascar', -18.9, 47.5, 2],
    ['Ankara', 39.9, 32.9, 4],
    ['Aden', 12.8, 45, 4],
    ['Seoul', 37.6, 127, 4],
    ['Port Moresby', -9.4, 147.2, 5],
    ['Sydney', -33.9, 151.2, 5],
    ['Honolulu', 21.3, -157.8, 5],
    ['Antarctica', -75, 20, 6],
  ])('assigns %s to its continent', (_name, latitude, longitude, expected) => {
    expect(continentColor(Number(latitude), Number(longitude))).toBe(expected);
  });
});

describe('stable, evenly distributed color pairs', () => {
  test.each([12000, 22000])(
    'balances both colors without changing the %i-point sampling budget',
    samples => {
      const colored = createLandParticles(mask, samples);
      const balance = Array.from({ length: 7 }, () => [0, 0]);
      expect(colored).toHaveLength(samples * 6);
      for (let offset = 0; offset < colored.length; offset += 6) {
        const tone = colored[offset + 5];
        expect([0, 1]).toContain(tone);
        balance[colored[offset + 3]][tone]++;
      }
      for (const [first, second] of balance) {
        expect(first).toBeGreaterThan(0);
        expect(second).toBeGreaterThan(0);
        expect(Math.abs(first - second)).toBeLessThanOrEqual(1);
      }
      expect(createLandParticles(mask, samples)).toEqual(colored);
    }
  );

  test('mixes the two colors within smaller geographic areas', () => {
    const points = createLandParticles(mask, 22000);
    const grains = Array.from({ length: points.length / 6 }, (_, index) => {
      const offset = index * 6;
      return {
        latitude: (Math.asin(points[offset + 1]) * 180) / Math.PI,
        longitude:
          (Math.atan2(-points[offset + 2], points[offset]) * 180) / Math.PI,
        tone: points[offset + 5],
      };
    });
    const areas = [
      { latitude: 35, longitude: -110 },
      { latitude: -20, longitude: -60 },
      { latitude: 10, longitude: 20 },
      { latitude: 50, longitude: 10 },
      { latitude: 40, longitude: 100 },
      { latitude: -25, longitude: 140 },
    ];
    for (const area of areas) {
      const nearby = grains.filter(
        grain =>
          Math.abs(grain.latitude - area.latitude) < 10 &&
          Math.abs(grain.longitude - area.longitude) < 10
      );
      const first = nearby.filter(grain => grain.tone === 0).length;
      expect(nearby.length).toBeGreaterThan(30);
      expect(first / nearby.length).toBeGreaterThan(0.35);
      expect(first / nearby.length).toBeLessThan(0.65);
    }
  });
});
