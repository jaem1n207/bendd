/* eslint-disable playwright/no-standalone-expect -- These are Vitest geometry tests. */
import { describe, expect, it } from 'vitest';

import {
  createSettleJourney,
  SETTLE_TIMING,
  settleFrame,
} from '@/components/connection-globe/lib/choreography';
import {
  GLOBE_RADIUS,
  SEOUL,
} from '@/components/connection-globe/lib/geometry';

const london = { latitude: 51.5074, longitude: -0.1278 };

describe('home Settle choreography', () => {
  it('hands the contours over to landing grains before assembly finishes, without drawing a route early', () => {
    const journey = createSettleJourney(london, 760, 414);
    expect(journey.sample(1000).formationProgress).toBe(0);
    const landing = journey.sample(2799);
    expect(landing.formationProgress).toBeLessThan(1);
    expect(journey.sample(2100).motion.coastOpacity).toBeCloseTo(0.72);
    expect(journey.sample(2400).motion.coastOpacity).toBeGreaterThan(0.2);
    expect(journey.sample(2400).motion.coastOpacity).toBeLessThan(0.6);
    expect(landing.motion.coastOpacity).toBeLessThan(0.001);
    expect(landing.motion.cloudReveal).toBe(1);
    expect(landing.routeProgress).toBe(0);
    expect(journey.sample(2800).formationProgress).toBe(1);
    expect(journey.sample(2800).motion.coastOpacity).toBe(0);
    expect(journey.sample(3000).motion.coastOpacity).toBe(0);
    expect(journey.sample(4399).routeProgress).toBe(0);
  });

  it('removes the contour without a visible opacity step at 60 fps', () => {
    let previous = settleFrame(2100).coastOpacity;
    for (let time = 2100 + 1000 / 60; time <= 3020; time += 1000 / 60) {
      const opacity = settleFrame(time).coastOpacity;
      expect(opacity).toBeLessThanOrEqual(previous);
      expect(previous - opacity).toBeLessThan(0.03);
      previous = opacity;
    }
    expect(previous).toBe(0);
  });

  it.each([320, 760])('hands the camera over continuously at %i px', width => {
    const journey = createSettleJourney(london, width, 414);
    for (const time of [2800, 3000, 4400, 6000]) {
      const before = journey.sample(time - 0.001).camera;
      const after = journey.sample(time).camera;
      expect(before.phi).toBeCloseTo(after.phi, 4);
      expect(before.theta).toBeCloseTo(after.theta, 4);
      expect(before.scale).toBeCloseTo(after.scale, 4);
    }
    expect(
      journey.sample(1000).camera.scale / journey.sample(2800).camera.scale
    ).toBeCloseTo(0.68);
  });

  it.each([256, 320, 760])(
    'keeps the Settle globe inside a %i px stage',
    width => {
      const height = 414;
      for (const visitor of [london, SEOUL]) {
        const journey = createSettleJourney(visitor, width, height);
        for (
          let time = SETTLE_TIMING.appearance;
          time <= SETTLE_TIMING.duration;
          time += 100
        ) {
          const diameter =
            GLOBE_RADIUS * journey.sample(time).camera.scale * height;
          expect(diameter).toBeLessThanOrEqual(Math.min(width, height));
        }
      }
    }
  );

  it('finishes the route before the last count, then holds the final scene for ambient color flow', () => {
    const journey = createSettleJourney(london, 760, 414);
    const arrival = journey.sample(SETTLE_TIMING.arrival);
    const complete = journey.sample(SETTLE_TIMING.duration);
    expect(arrival.phase).toBe('arrived');
    expect(arrival.routeProgress).toBe(1);
    expect(complete.phase).toBe('complete');
    expect(complete.camera).toEqual(arrival.camera);
    expect(complete.route).toEqual(arrival.route);
    expect(journey.sample(20000)).toEqual(complete);
    expect(settleFrame(SETTLE_TIMING.duration).glowOpacity).toBeCloseTo(0.34);
  });

  it('preserves the nearby cluster and unavailable-location contracts', () => {
    const nearby = createSettleJourney(SEOUL, 320, 320).sample(6600);
    expect(nearby.nearby).toBe(true);
    expect(nearby.routes).toEqual([]);
    expect(nearby.destination.x).toBeCloseTo(160);
    expect(nearby.destination.y).toBeCloseTo(160);
    const unavailable = createSettleJourney(null, 320, 320).sample(6600);
    expect(unavailable.nearby).toBe(false);
    expect(unavailable.routes).toEqual([]);
    expect(unavailable.destination.visible).toBe(true);
  });
});
