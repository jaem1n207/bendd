'use client';

import { motion } from 'motion/react';
import { useState, type ReactNode } from 'react';

import { DockInput } from '@/components/navigation/consts/dock';
import { useNavigationItemAnimation } from '@/components/navigation/model/use-navigation-item-animation';
import styles from '@/components/navigation/ui/dock.module.css';
import { cn } from '@/lib/utils';

export function NavigationItemTooltip({
  name,
  children,
  className,
}: {
  name: string;
  children: ReactNode;
  className?: string;
}) {
  const { handleClick, stopMotion, controls, allowMotion } =
    useNavigationItemAnimation({
      name,
    });
  const [input, setInput] = useState(DockInput.Static);
  return (
    <div
      data-navigation-item=""
      data-dock-label={name}
      className={cn(styles.item, className)}
    >
      <motion.div
        className={styles.itemBody}
        animate={controls}
        initial={false}
        whileTap={
          allowMotion && input === DockInput.Pointer ? { y: 8 } : undefined
        }
        transition={
          allowMotion
            ? { type: 'spring', stiffness: 420, damping: 24 }
            : { duration: 0 }
        }
        onPointerDownCapture={event =>
          setInput(
            event.pointerType === 'mouse' ? DockInput.Pointer : DockInput.Static
          )
        }
        onKeyDownCapture={() => {
          setInput(DockInput.Keyboard);
          stopMotion();
        }}
        onClick={event => {
          void handleClick(event.detail === 0 ? DockInput.Keyboard : input);
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
