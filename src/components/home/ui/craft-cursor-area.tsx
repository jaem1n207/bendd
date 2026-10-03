'use client';

import { motion, useMotionValue } from 'motion/react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  createCraftCursor,
  getCursorBadgeOffset,
  type CraftCursorState,
} from '@/components/home/lib/craft-cursor';
import styles from '@/components/home/ui/craft-cursor-area.module.css';
import { Cursor } from '@/components/ui/cursor';

export function CraftCursorArea({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const badge = useRef<HTMLDivElement>(null);
  const dimensions = useRef({ width: 0, height: 0 });
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const badgeX = useMotionValue(0);
  const badgeY = useMotionValue(0);
  const [state, setState] = useState<CraftCursorState>({
    visible: false,
    label: '',
  });

  const placeBadge = useCallback(() => {
    const offset = getCursorBadgeOffset({
      x: x.get(),
      y: y.get(),
      ...dimensions.current,
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: window.innerHeight,
    });
    badgeX.set(offset.x);
    badgeY.set(offset.y);
  }, [x, y, badgeX, badgeY]);

  useLayoutEffect(() => {
    const element = badge.current;
    if (!element) {
      return;
    }
    const measure = () => {
      dimensions.current = {
        width: element.offsetWidth,
        height: element.offsetHeight,
      };
      placeBadge();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [state.label, placeBadge]);

  useEffect(() => {
    if (!root.current) {
      return;
    }
    return createCraftCursor({
      root: root.current,
      onState: setState,
      onMove: (nextX, nextY) => {
        x.set(nextX);
        y.set(nextY);
        placeBadge();
      },
    });
  }, [x, y, placeBadge]);

  return (
    <div ref={root} className={className}>
      {children}
      <Cursor x={x} y={y} visible={state.visible}>
        <motion.div
          className={styles.badgePosition}
          style={{ x: badgeX, y: badgeY }}
        >
          <div ref={badge} className={styles.badge}>
            {state.label}
          </div>
        </motion.div>
      </Cursor>
    </div>
  );
}
