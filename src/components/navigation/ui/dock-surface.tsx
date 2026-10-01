'use client';

import { MoveVertical } from 'lucide-react';
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
  DOCK_MAX_SIZE,
  DOCK_MIN_SIZE,
  DockMotionMode,
} from '@/components/navigation/consts/dock';
import { clampDockSize } from '@/components/navigation/lib/dock-geometry';
import {
  createDockMotion,
  type DockTooltipState,
} from '@/components/navigation/lib/dock-motion';
import { createDockResize } from '@/components/navigation/lib/dock-resize';
import { DockTooltip } from '@/components/navigation/ui/dock-tooltip';
import styles from '@/components/navigation/ui/dock.module.css';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { useScrollFade } from '@/hooks/use-scroll-fade';

export function DockSurface({
  children,
  size,
  onSizeChange,
  label = 'Dock',
}: {
  children: ReactNode;
  size: number;
  onSizeChange: (size: number) => void;
  label?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLButtonElement>(null);
  const driver = useRef<ReturnType<typeof createDockResize> | null>(null);
  const commit = useRef(onSizeChange);
  commit.current = onSizeChange;
  const initialSize = useRef(size);
  useScrollFade(viewport, 'x', Children.count(children));
  const id = useId();
  const reduced = usePrefersReducedMotion();
  const [tooltip, setTooltip] = useState<DockTooltipState | null>(null);
  const mode =
    reduced === false ? DockMotionMode.Animated : DockMotionMode.Static;

  useEffect(() => {
    if (!root.current || !handle.current) {
      return;
    }
    const resize = createDockResize({
      root: root.current,
      handle: handle.current,
      size: initialSize.current,
      onCommit: value => commit.current(value),
    });
    driver.current = resize;
    return () => {
      resize.dispose();
      driver.current = null;
    };
  }, []);
  useEffect(() => {
    driver.current?.setSize(size);
  }, [size]);
  useEffect(() => {
    if (!root.current) {
      return;
    }
    setTooltip(null);
    return createDockMotion({
      root: root.current,
      mode,
      tooltipId: id,
      onTooltip: setTooltip,
    });
  }, [mode, id]);

  const itemSize = clampDockSize(size);
  const variables: CSSProperties & { '--dock-size': string } = {
    '--dock-size': `${itemSize}px`,
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
      <div className={styles.backdrop} />
      <div
        ref={viewport}
        className={`${styles.viewport} scroll-fade-x [--scroll-fade-reveal:32px] [--scroll-fade-size:12px]`}
        data-dock-viewport=""
      >
        <div className={styles.rail} data-dock-rail="">
          {children}
        </div>
      </div>
      <div
        className={styles.resizeItem}
        data-navigation-item=""
        data-dock-label="Resize Dock"
      >
        <button
          ref={handle}
          type="button"
          role="slider"
          aria-label="Resize Dock"
          aria-describedby={`${id}-resize-help`}
          aria-orientation="vertical"
          aria-valuemin={DOCK_MIN_SIZE}
          aria-valuemax={DOCK_MAX_SIZE}
          aria-valuenow={itemSize}
          aria-valuetext={`${Number(itemSize.toFixed(1))}px`}
          className={styles.resizeHandle}
        >
          <MoveVertical aria-hidden="true" size={18} strokeWidth={1.5} />
        </button>
        <span id={`${id}-resize-help`} className="sr-only">
          누른 채 위아래로 끌어 크기를 조절합니다. 방향키로 조절하고 Enter로
          기본 크기를 복원합니다.
        </span>
        {/* 숫자 텍스트는 resize driver가 소유한다. */}
        <span
          className={styles.resizeSize}
          data-dock-size-output=""
          aria-hidden="true"
        />
      </div>
      <div className={styles.tooltipAnchor} data-dock-tooltip="">
        <DockTooltip id={id} state={tooltip} mode={mode} />
      </div>
    </div>
  );
}
