import {
  DOCK_DEFAULT_SIZE,
  DOCK_MAX_SIZE,
  DOCK_MIN_SIZE,
  DOCK_SPRING_FREQUENCY,
} from '@/components/navigation/consts/dock';

export interface DockPreferences {
  size: number;
}

export function clampDockSize(value: number) {
  return Number.isFinite(value)
    ? Math.max(DOCK_MIN_SIZE, Math.min(DOCK_MAX_SIZE, value))
    : DOCK_DEFAULT_SIZE;
}

export function readDockPreferences(value: unknown): DockPreferences {
  return {
    size: clampDockSize(
      value &&
        typeof value === 'object' &&
        'size' in value &&
        typeof value.size === 'number'
        ? value.size
        : DOCK_DEFAULT_SIZE
    ),
  };
}

/** 감쇠 임계점의 해를 사용해 프레임 속도에 관계없이 현재 속도를 이어간다. */
export function stepDockSpring(
  value: number,
  velocity: number,
  target: number,
  seconds: number
) {
  const frequency = DOCK_SPRING_FREQUENCY;
  const decay = Math.exp(-frequency * seconds);
  const offset = value - target;
  const carried = (velocity + frequency * offset) * seconds;
  return {
    value: target + (offset + carried) * decay,
    velocity: (velocity - frequency * carried) * decay,
  };
}
