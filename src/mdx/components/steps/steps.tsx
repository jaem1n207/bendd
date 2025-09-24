import { isValidElement, type ReactNode } from 'react';
import { z } from 'zod';

import { cn } from '@/lib/utils';
import styles from './steps.module.css';

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

type StepsProps = z.infer<typeof StepsSchema>;

export function MDXSteps({ children, className }: StepsProps) {
  return (
    <div
      className={cn(
        styles.container,
        'bendd-steps bd:ml-4 bd:mb-12 bd:border-l bd:border bd:pl-6',
        '[counter-reset:step]',
        className
      )}
    >
      {children}
    </div>
  );
}
