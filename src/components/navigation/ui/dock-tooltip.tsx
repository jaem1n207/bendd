'use client';

import { AnimatePresence, motion, type Transition } from 'motion/react';

import { DockInput, DockMotionMode } from '@/components/navigation/consts/dock';
import type { DockTooltipState } from '@/components/navigation/lib/dock-motion';
import styles from '@/components/navigation/ui/dock.module.css';

const textMotion = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 8 }),
  visible: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -8 }),
};
const transition: Transition = { duration: 0.16, ease: [0.22, 1, 0.36, 1] };

export function DockTooltip({
  id,
  state,
  mode,
}: {
  id: string;
  state: DockTooltipState | null;
  mode: DockMotionMode;
}) {
  const animate =
    mode === DockMotionMode.Animated && state?.input === DockInput.Pointer;
  return (
    <AnimatePresence>
      {state && (
        <motion.div
          id={id}
          role="tooltip"
          className={styles.tooltip}
          layout={animate ? 'size' : false}
          initial={animate ? { opacity: 0, y: 4 } : false}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={animate ? transition : { duration: 0 }}
          data-tooltip-direction={state.direction}
        >
          <span className="sr-only">{state.name}</span>
          <span className={styles.tooltipText} aria-hidden="true">
            <span className={styles.tooltipSizer}>{state.name}</span>
            {animate ? (
              <AnimatePresence
                initial={false}
                custom={state.direction}
                mode="sync"
              >
                <motion.span
                  key={state.name}
                  className={styles.tooltipLabel}
                  custom={state.direction}
                  variants={textMotion}
                  initial={animate ? 'enter' : false}
                  animate="visible"
                  exit={animate ? 'exit' : undefined}
                  transition={animate ? transition : { duration: 0 }}
                >
                  {state.name}
                </motion.span>
              </AnimatePresence>
            ) : (
              <span className={styles.tooltipLabel}>{state.name}</span>
            )}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
