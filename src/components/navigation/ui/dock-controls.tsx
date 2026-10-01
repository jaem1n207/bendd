'use client';

import { useId } from 'react';

import {
  DOCK_MAX_MAGNIFICATION,
  DOCK_MAX_SIZE,
  DOCK_MIN_MAGNIFICATION,
  DOCK_MIN_SIZE,
} from '@/components/navigation/consts/dock';
import {
  clampDockSize,
  clampMagnification,
} from '@/components/navigation/lib/dock-geometry';
import styles from '@/components/navigation/ui/dock.module.css';

export function DockControls({
  size,
  magnification,
  onSizeChange,
  onMagnificationChange,
  labelPrefix = '',
}: {
  size: number;
  magnification: number;
  onSizeChange: (value: number) => void;
  onMagnificationChange: (value: number) => void;
  labelPrefix?: string;
}) {
  const id = useId();
  return (
    <div className={styles.controls}>
      <div className={styles.control}>
        <div className={styles.controlLabel}>
          <label htmlFor={`${id}-size`}>{labelPrefix}아이콘 크기</label>
          <output htmlFor={`${id}-size`}>{size}px</output>
        </div>
        <input
          id={`${id}-size`}
          type="range"
          min={DOCK_MIN_SIZE}
          max={DOCK_MAX_SIZE}
          step={1}
          value={size}
          onChange={event =>
            onSizeChange(clampDockSize(event.currentTarget.valueAsNumber))
          }
        />
      </div>
      <div className={styles.control}>
        <div className={styles.controlLabel}>
          <label htmlFor={`${id}-magnification`}>{labelPrefix}확대 크기</label>
          <output htmlFor={`${id}-magnification`}>{magnification}px</output>
        </div>
        <input
          id={`${id}-magnification`}
          type="range"
          min={DOCK_MIN_MAGNIFICATION}
          max={DOCK_MAX_MAGNIFICATION}
          step={1}
          value={magnification}
          onChange={event =>
            onMagnificationChange(
              clampMagnification(event.currentTarget.valueAsNumber)
            )
          }
        />
      </div>
    </div>
  );
}
