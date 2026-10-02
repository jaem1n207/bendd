'use client';

import { useContext } from 'react';

import {
  DOCK_MAX_SIZE,
  DOCK_MIN_SIZE,
} from '@/components/navigation/consts/dock';
import { DockContext } from '@/components/navigation/model/dock-context';
import styles from '@/components/navigation/ui/dock.module.css';

export function DockSeparator() {
  const dock = useContext(DockContext);
  if (!dock) {
    throw new Error('DockSeparator requires DockSurface');
  }
  return (
    <button
      type="button"
      role="slider"
      aria-label="Dock 크기 조절"
      aria-describedby={`${dock.id}-resize-help`}
      aria-orientation="vertical"
      aria-valuemin={DOCK_MIN_SIZE}
      aria-valuemax={DOCK_MAX_SIZE}
      aria-valuenow={dock.size}
      aria-valuetext={`${Number(dock.size.toFixed(1))}px`}
      aria-haspopup="dialog"
      aria-controls={dock.expanded ? `${dock.id}-settings` : undefined}
      className={styles.separator}
      data-dock-separator=""
    >
      <span className={styles.separatorLine} aria-hidden="true" />
      {/* 드래그 숫자 텍스트는 resize driver가 소유한다. */}
      <span
        className={styles.resizeSize}
        data-dock-size-output=""
        aria-hidden="true"
      />
    </button>
  );
}
