import { isValidElement, type ReactNode } from 'react';
import { z } from 'zod';

import { cn } from '@/lib/utils';
import styles from './steps.module.css';

type StepsProps = z.infer<typeof StepsSchema>;

const StepsSchema = z.object({
  children: z
    .custom<ReactNode>(v => isValidElement(v) || typeof v === 'string')
    .or(
      z.array(
        z.custom<ReactNode>(v => isValidElement(v) || typeof v === 'string')
      )
    ),
  className: z.string().optional(),
});

export function MDXSteps({ children, className }: StepsProps) {
  return (
    <div
      className={cn(
        styles.container,
        'bendd-steps ml-4 mb-12 border-l border-border pl-6',
        '[counter-reset:step]',
        className
      )}
    >
      {children}
    </div>
  );
}
