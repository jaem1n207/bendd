'use client';

import { motion, type MotionValue } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import styles from '@/components/ui/cursor.module.css';
import { cn } from '@/lib/utils';

interface CursorProps {
  children: ReactNode;
  x: MotionValue<number>;
  y: MotionValue<number>;
  visible: boolean;
  className?: string;
}

/** 위치는 즉시 갱신하고, 등장과 퇴장만 전환한다. */
export function Cursor({ children, x, y, visible, className }: CursorProps) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHost(document.body);
  }, []);

  if (!host) {
    return null;
  }

  return createPortal(
    <motion.div
      className={cn(styles.cursor, className)}
      style={{ x, y }}
      data-cursor-visible={visible}
      aria-hidden="true"
    >
      {children}
    </motion.div>,
    host
  );
}
