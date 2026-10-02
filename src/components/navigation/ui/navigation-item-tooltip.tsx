'use client';

import type { ReactNode } from 'react';

import { useNavigationSound } from '@/components/navigation/model/use-navigation-sound';
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
  const { handleClick } = useNavigationSound({ name });
  return (
    <div
      data-navigation-item=""
      data-dock-label={name}
      className={cn(styles.item, className)}
      onClick={handleClick}
    >
      <div className={styles.itemBody}>
        <span className={styles.itemSurface} aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}
