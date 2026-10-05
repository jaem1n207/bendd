/* eslint-disable playwright/no-standalone-expect -- These are Vitest tests; the shared .spec.ts glob also enables Playwright's rule. */
import { describe, expect, it } from 'vitest';

import {
  distanceInMeters,
  DURATION_MS,
  formatDistance,
  greatCircle,
  sceneAt,
  SEOUL,
  timelineAt,
  toVector,
  type Coordinates,
} from '@/components/connection-globe/lib/geometry';

describe('connection globe geography', () => {
  it('measures surface distance, including the equator and identical coordinates', () => {
    expect(distanceInMeters(SEOUL, SEOUL)).toBe(0);
    expect(
      distanceInMeters(
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 90 }
      )
    ).toBeCloseTo(10007557.221, 2);
    expect(
      distanceInMeters(SEOUL, {
        latitude: -SEOUL.latitude,
        longitude: SEOUL.longitude - 180,
      })
    ).toBeCloseTo(20015114.442, 2);
  });

  it('uses meters for short distances and keeps the unit stable throughout the count', () => {
    expect(formatDistance(450, 0)).toBe('0 m');
    expect(formatDistance(450, 0.5)).toBe('225 m');
    expect(formatDistance(0, 1)).toBe('0 m');
    expect(formatDistance(10550000, 0)).toBe('0 km');
    expect(formatDistance(10550000, 1)).toBe('10,550 km');
  });

  it('chooses a finite shortest arc for exactly opposite points', () => {
    const start = toVector({ latitude: 0, longitude: 0 });
    const end = toVector({ latitude: 0, longitude: 180 });
    const middle = greatCircle(start, end, 0.5);
    expect(Math.hypot(middle.x, middle.y, middle.z)).toBeCloseTo(1);
    expect(middle.x).toBeCloseTo(0);
    expect(greatCircle(start, end, 1)).toEqual(end);
  });

  const visitors: Coordinates[] = [
    { latitude: 37.7749, longitude: -122.4194 },
    { latitude: 51.5074, longitude: -0.1278 },
    { latitude: -SEOUL.latitude, longitude: SEOUL.longitude - 180 },
    { latitude: -SEOUL.latitude + 0.00001, longitude: SEOUL.longitude - 180 },
    { latitude: 90, longitude: 0 },
    { latitude: -90, longitude: 0 },
    { latitude: 37.5667, longitude: 126.978 },
    SEOUL,
  ];

  it.each(visitors)(
    'fits both endpoints and their labels on a narrow phone for %j',
    visitor => {
      const scene = sceneAt(visitor, 320, 320, DURATION_MS);
      for (const point of [scene.visitorMarker, scene.seoulMarker]) {
        expect(point.x).toBeGreaterThanOrEqual(40);
        expect(point.x).toBeLessThanOrEqual(280);
        expect(point.y).toBeGreaterThanOrEqual(60);
        expect(point.y).toBeLessThanOrEqual(260);
      }
      expect(scene.origin.depth).toBeGreaterThan(-1e-6);
      expect(scene.destination.depth).toBeGreaterThan(-1e-6);
      expect(scene.route).not.toMatch(/NaN|Infinity/);
    }
  );

  it.each([
    SEOUL,
    { latitude: 37.47640540822408, longitude: 127.1742778820604 },
  ])(
    'keeps nearby coordinates on the globe without an invented route: %j',
    visitor => {
      const start = sceneAt(visitor, 320, 320, 3000);
      const middle = sceneAt(visitor, 320, 320, 3200);
      const final = sceneAt(visitor, 320, 320, DURATION_MS);
      expect(start.nearby).toBe(true);
      for (const scene of [start, middle, final]) {
        expect(scene.visitorMarker).toEqual(scene.origin);
        expect(scene.seoulMarker).toEqual(scene.destination);
        expect(scene.head).toEqual(scene.destination);
        expect(scene.routes).toEqual([]);
        expect(scene.route).toBe('');
      }
      expect(final.destination.x).toBeCloseTo(160);
      expect(final.destination.y).toBeCloseTo(160);
      expect(
        sceneAt(visitor, 320, 320, 1000).camera.scale / final.camera.scale
      ).toBeGreaterThan(2);
    }
  );

  it('keeps the zero-distance timeline while the shared anchor stays still', () => {
    const early = sceneAt(SEOUL, 320, 320, 3100);
    const late = sceneAt(SEOUL, 320, 320, 4000);
    expect(early.phase).toBe('connecting');
    expect(late.routeProgress).toBeGreaterThan(early.routeProgress);
    expect(late.head).toEqual(early.head);
    expect(
      formatDistance(distanceInMeters(SEOUL, SEOUL), late.routeProgress)
    ).toBe('0 m');
  });

  it('uses the shared vicinity only within 50 km, never for an unknown or distant visitor', () => {
    expect(
      sceneAt(
        { latitude: SEOUL.latitude + 0.44, longitude: SEOUL.longitude },
        320,
        320,
        DURATION_MS
      ).nearby
    ).toBe(true);
    expect(
      sceneAt(
        { latitude: SEOUL.latitude + 0.46, longitude: SEOUL.longitude },
        320,
        320,
        DURATION_MS
      ).nearby
    ).toBe(false);
    expect(sceneAt(null, 320, 320, DURATION_MS).nearby).toBe(false);
    expect(sceneAt(visitors[0], 320, 320, DURATION_MS).nearby).toBe(false);
  });

  it('assembles from an overview, holds the visitor, then draws after the camera settles', () => {
    const visitor = { latitude: 37.7749, longitude: -122.4194 };
    const first = sceneAt(visitor, 760, 414, 0);
    const origin = sceneAt(visitor, 760, 414, 1000);
    expect(first.camera.scale).toBeLessThan(1);
    expect(first.formationProgress).toBe(0);
    expect(origin.origin.x).toBeCloseTo(380);
    expect(origin.origin.y).toBeCloseTo(207);
    expect(origin.formationProgress).toBe(1);
    expect(timelineAt(1100).phase).toBe('origin');
    expect(timelineAt(2999).routeProgress).toBe(0);
    expect(timelineAt(3000).cameraProgress).toBe(1);
    expect(timelineAt(3300).routeProgress).toBeGreaterThan(0.5);
    expect(timelineAt(4600)).toMatchObject({
      phase: 'complete',
      cameraProgress: 1,
      routeProgress: 1,
    });
  });

  it('keeps the raised route in world space when manually rotating the camera', () => {
    const visitor = { latitude: 37.7749, longitude: -122.4194 };
    const scene = sceneAt(visitor, 760, 414, DURATION_MS);
    const rotated = sceneAt(visitor, 760, 414, DURATION_MS, {
      ...scene.camera,
      phi: scene.camera.phi + Math.PI,
    });
    expect(
      scene.routes[0].some(point => Math.hypot(point.x, point.y, point.z) > 1.2)
    ).toBe(true);
    expect(rotated.routes).toEqual(scene.routes);
    expect(rotated.destination.visible).toBe(false);
    expect(scene.destination.visible).toBe(true);
    expect(rotated.route).not.toEqual(scene.route);
  });
});
