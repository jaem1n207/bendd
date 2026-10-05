import { cubicBezier } from 'motion/react';

import {
  clamp,
  createJourney,
  type Camera,
  type Coordinates,
} from '@/components/connection-globe/lib/geometry';

const reveal = cubicBezier(0.19, 1, 0.22, 1);
const travel = cubicBezier(0.645, 0.045, 0.355, 1);
const coast = cubicBezier(0.4, 0, 0.2, 1);
const progress = (time: number, from: number, to: number) =>
  clamp((time - from) / (to - from));

export const SETTLE_TIMING = {
  appearance: 1000,
  assemblyEnd: 2800,
  cameraStart: 3000,
  connectionStart: 4400,
  arrival: 6000,
  duration: 6600,
};

/** Every visual samples the same clock, including scrubbing and reduced motion. */
export function settleFrame(time: number) {
  const { appearance, assemblyEnd, cameraStart, connectionStart, arrival } =
    SETTLE_TIMING;
  // A linear assembly clock lets each grain own its delay and arrival time.
  // Scale and yaw settle early; the last airborne grains continue descending.
  const formation = progress(time, appearance, assemblyEnd);
  // Preserve the approved assembly's relative cues while shortening its clock.
  const assemblyCue = (offset: number) =>
    appearance + (offset / 3000) * (assemblyEnd - appearance);
  const rotationTail = Math.exp(-7.35);
  const rotationRemaining =
    (Math.exp(-7.35 * formation) - rotationTail) / (1 - rotationTail);
  const coastReveal = coast(progress(time, appearance, assemblyCue(500)));
  // As the framing settles, let the landing grains take over the outline.
  // Smoothstep keeps both ends still, avoiding a separate fade-out beat.
  const coastHandoff = progress(time, assemblyCue(1800), assemblyEnd);
  const coastRemaining = 1 - coastHandoff ** 2 * (3 - 2 * coastHandoff);
  const glowReveal = reveal(progress(time, appearance, assemblyCue(580)));
  const secondGlow = reveal(
    progress(time, assemblyEnd + 100, cameraStart + 600)
  );
  const arrivalProgress = travel(progress(time, arrival - 500, arrival));
  return {
    formation,
    rotationRemaining,
    approach:
      1 - Math.pow(1 - progress(time, appearance, assemblyCue(1800)), 3),
    cloudReveal: reveal(progress(time, appearance, assemblyCue(220))),
    coastProgress: progress(time, appearance, assemblyCue(500)),
    coastOpacity: 0.72 * coastReveal * coastRemaining,
    glowOpacity:
      glowReveal *
        (0.82 - 0.36 * travel(progress(time, assemblyCue(1150), assemblyEnd))) +
      0.12 * secondGlow -
      0.24 * arrivalProgress,
    glowScale:
      0.94 + 0.46 * reveal(progress(time, appearance, assemblyCue(850))),
    visitor: reveal(progress(time, assemblyEnd, cameraStart)),
    destination: reveal(progress(time, connectionStart, connectionStart + 200)),
    caption: reveal(progress(time, connectionStart, connectionStart + 180)),
    journeyTime:
      time < cameraStart
        ? 1000
        : time < connectionStart
          ? 1200 + progress(time, cameraStart, connectionStart) * 1800
          : 3000 + progress(time, connectionStart, arrival) * 1600,
  };
}

export type SettleFrame = ReturnType<typeof settleFrame>;

/** Assemble over the Atlantic, then frame the real visitor and Seoul. */
export function createSettleJourney(
  visitor: Coordinates | null,
  width: number,
  height: number
) {
  const journey = createJourney(visitor, width, height, {
    latitude: 18,
    longitude: -52,
  });
  const origin = journey.sample(1000).camera;
  return {
    routes: journey.routes,
    finalCamera: journey.finalCamera,
    sample(time: number, manualCamera?: Camera) {
      const motion = settleFrame(time);
      const camera =
        time < SETTLE_TIMING.cameraStart
          ? {
              phi: origin.phi + 1.75 * motion.rotationRemaining,
              theta: origin.theta - 0.08 * motion.rotationRemaining,
              scale: origin.scale * (0.68 + 0.32 * motion.approach),
            }
          : manualCamera;
      const scene = journey.sample(motion.journeyTime, camera);
      return {
        ...scene,
        formationProgress: motion.formation,
        phase:
          time >= SETTLE_TIMING.duration
            ? 'complete'
            : time >= SETTLE_TIMING.arrival
              ? 'arrived'
              : time >= SETTLE_TIMING.connectionStart
                ? 'connecting'
                : time >= SETTLE_TIMING.cameraStart
                  ? 'camera'
                  : time >= SETTLE_TIMING.assemblyEnd
                    ? 'origin'
                    : 'forming',
        motion,
      };
    },
  };
}
