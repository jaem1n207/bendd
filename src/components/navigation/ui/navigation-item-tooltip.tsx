'use client';

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
  const {
    handleClick,
    handlePointerDown,
    handleKeyDown,
    stopMotion,
    bodyStyle,
  } = useNavigationItemAnimation({ name });
  return (
    <div
      data-navigation-item=""
      data-dock-label={name}
      className={cn(styles.item, className)}
      onPointerDownCapture={handlePointerDown}
      onPointerLeave={stopMotion}
      onKeyDownCapture={handleKeyDown}
      onClick={handleClick}
    >
      <div className={styles.itemBody} style={bodyStyle}>
        {children}
      </div>
    </div>
  );
}
