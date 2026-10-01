'use client';

import {
  Children,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

import {
  DOCK_TOUCH_TARGET,
  DockMotionMode,
} from '@/components/navigation/consts/dock';
import {
  clampDockSize,
  clampMagnification,
} from '@/components/navigation/lib/dock-geometry';
import {
  createDockMotion,
  type DockTooltipState,
} from '@/components/navigation/lib/dock-motion';
import { DockTooltip } from '@/components/navigation/ui/dock-tooltip';
import styles from '@/components/navigation/ui/dock.module.css';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { useScrollFade } from '@/hooks/use-scroll-fade';

export function DockSurface({
  children,
  size,
  magnification,
  paused = false,
  label = 'Dock',
}: {
  children: ReactNode;
  size: number;
  magnification: number;
  paused?: boolean;
  label?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  useScrollFade(viewport, 'x', Children.count(children));
  const id = useId();
  const reduced = usePrefersReducedMotion();
  const [coarse, setCoarse] = useState(false);
  const [tooltip, setTooltip] = useState<DockTooltipState | null>(null);
  const itemSize = Math.max(
    clampDockSize(size),
    coarse ? DOCK_TOUCH_TARGET : 0
  );
  const peak = clampMagnification(magnification);
  const mode =
    reduced === false && !coarse && !paused
      ? DockMotionMode.Animated
      : DockMotionMode.Static;

  useEffect(() => {
    const media = window.matchMedia('(hover: none), (pointer: coarse)');
    const update = () => setCoarse(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!root.current) {
      return;
    }
    setTooltip(null);
    return createDockMotion({
      root: root.current,
      size: itemSize,
      magnification: peak,
      mode,
      tooltipId: id,
      onTooltip: setTooltip,
    });
  }, [itemSize, peak, mode, id]);

  const variables: CSSProperties & {
    '--dock-size': string;
    '--dock-peak': string;
  } = {
    '--dock-size': `${itemSize}px`,
    '--dock-peak': `${peak}px`,
  };
  return (
    <div
      ref={root}
      className={styles.dock}
      style={variables}
      role="group"
      aria-label={label}
      data-dock=""
      data-dock-mode={mode}
    >
      <div className={styles.hoverArea} data-dock-hover-area="" />
      <div className={styles.backdrop} data-dock-backdrop="" />
      <div
        ref={viewport}
        className={`${styles.viewport} scroll-fade-x [--scroll-fade-reveal:32px] [--scroll-fade-size:12px]`}
        data-dock-viewport=""
      >
        <div className={styles.rail} data-dock-rail="">
          {children}
        </div>
      </div>
      <div className={styles.tooltipAnchor} data-dock-tooltip="">
        <DockTooltip id={id} state={tooltip} mode={mode} />
      </div>
    </div>
  );
}
