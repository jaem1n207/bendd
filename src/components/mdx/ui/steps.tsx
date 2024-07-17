import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';
import styles from '../style/steps.module.css';

export function Steps({
  children,
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        styles.container,
        'bendd-steps bd-ml-4 bd-mb-12 bd-border-l bd-border-border bd-pl-6',
        '[counter-reset:step]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
