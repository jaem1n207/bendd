import { clamp } from '@/components/connection-globe/lib/geometry';

/** Broad continental color regions, independent of the visitor's location. */
export function continentColor(latitude: number, longitude: number) {
  if (latitude < -60) {
    return 6;
  }
  if (longitude < -30) {
    return latitude < 10 && (longitude > -85 || latitude < 0) ? 1 : 0;
  }
  if (longitude > 110 && latitude < -10) {
    return 5;
  }
  if (longitude > 60 || (longitude > 25 && latitude > 5 && latitude < 40)) {
    return 4;
  }
  if (latitude > 35) {
    return 3;
  }
  return 2;
}

/** Sample an equirectangular land mask at equal-area Fibonacci sphere points. */
export function createLandParticles(
  mask: { width: number; height: number; data: Uint8ClampedArray },
  samples: number
) {
  const particles: number[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let index = 0; index < samples; index++) {
    const y = 1 - (2 * (index + 0.5)) / samples;
    const radius = Math.sqrt(1 - y * y);
    const longitude = ((index * goldenAngle) % (Math.PI * 2)) - Math.PI;
    const latitude = Math.asin(y);
    const column = clamp(
      Math.floor(((longitude + Math.PI) / (2 * Math.PI)) * mask.width),
      0,
      mask.width - 1
    );
    const row = clamp(
      Math.floor(((Math.PI / 2 - latitude) / Math.PI) * mask.height),
      0,
      mask.height - 1
    );
    if (mask.data[(row * mask.width + column) * 4] < 128) {
      continue;
    }
    const seed = Math.sin(index * 127.1 + 311.7) * 43758.5453;
    particles.push(
      radius * Math.cos(longitude),
      y,
      -radius * Math.sin(longitude),
      continentColor((latitude * 180) / Math.PI, (longitude * 180) / Math.PI),
      seed - Math.floor(seed)
    );
  }
  return new Float32Array(particles);
}
