'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';

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
  const { handleClick, handleKeyDown, bodyStyle } = useNavigationItemAnimation({
    name,
  });
  return (
    <div
      data-navigation-item=""
      data-dock-label={name}
      className={cn(styles.item, className)}
      onClick={handleClick}
      onKeyDownCapture={handleKeyDown}
    >
      <motion.div className={styles.itemBody} style={bodyStyle}>
        {children}
      </motion.div>
    </div>
  );
}
