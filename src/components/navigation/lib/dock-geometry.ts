import {
  DOCK_DEFAULT_SIZE,
  DOCK_DEFAULT_MAGNIFICATION,
  DOCK_MIN_MAGNIFICATION,
  DOCK_MAX_MAGNIFICATION,
  DOCK_MAX_SIZE,
  DOCK_MIN_SIZE,
  DOCK_SPRING_FREQUENCY,
} from '@/components/navigation/consts/dock';

export interface DockPreferences {
  size: number;
  magnification: number;
}

export function clampDockSize(value: number) {
  return Number.isFinite(value)
    ? Math.max(DOCK_MIN_SIZE, Math.min(DOCK_MAX_SIZE, value))
    : DOCK_DEFAULT_SIZE;
}

export function clampMagnification(value: number) {
  return Number.isFinite(value)
    ? Math.max(DOCK_MIN_MAGNIFICATION, Math.min(DOCK_MAX_MAGNIFICATION, value))
    : DOCK_DEFAULT_MAGNIFICATION;
}

export function readDockPreferences(value: unknown): DockPreferences {
  const saved = value && typeof value === 'object' ? value : {};
  return {
    size: clampDockSize(
      'size' in saved && typeof saved.size === 'number'
        ? saved.size
        : DOCK_DEFAULT_SIZE
    ),
    magnification: clampMagnification(
      'magnification' in saved && typeof saved.magnification === 'number'
        ? saved.magnification
        : DOCK_DEFAULT_MAGNIFICATION
    ),
  };
}

export function getDockTargets({
  centers,
  size,
  magnification,
  pointer,
  budget,
}: {
  centers: readonly number[];
  size: number;
  magnification: number;
  pointer: number | null;
  budget: number;
}) {
  const radius = size * 2.5;
  const growth = centers.map(center => {
    if (pointer === null || !Number.isFinite(pointer)) {
      return 0;
    }
    const distance = Math.min(1, Math.abs(pointer - center) / radius);
    return (
      (size *
        (clampMagnification(magnification) - 1) *
        (1 + Math.cos(distance * Math.PI))) /
      2
    );
  });
  const total = growth.reduce((sum, value) => sum + value, 0);
  const fit = total > 0 ? Math.min(1, Math.max(0, budget) / total) : 1;
  return growth.map(value => value * fit);
}

export function getDockOffsets(growth: readonly number[]) {
  const total = growth.reduce((sum, value) => sum + value, 0);
  let before = 0;
  return growth.map(value => {
    const x = before + value / 2 - total / 2;
    before += value;
    return x;
  });
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
