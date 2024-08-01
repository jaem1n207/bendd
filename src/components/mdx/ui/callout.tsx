import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { z } from 'zod';

import { cn } from '@/lib/utils';

import { createMDXComponent } from './create-mdx-component';

const TypeToEmoji = {
  info: '💡',
  error: '🚫',
  warning: '⚠️',
};

type CalloutType = keyof typeof TypeToEmoji;

const classes: Record<CalloutType, string> = {
  info: cn(
    'bd-border-blue-100 bd-bg-blue-50 bd-text-blue-800 dark:bd-border-blue-400/30 dark:bd-bg-blue-400/20 dark:bd-text-blue-300'
  ),
  error: cn(
    'bd-border-red-200 bd-bg-red-100 bd-text-red-900 dark:bd-border-red-200/30 dark:bd-bg-red-900/30 dark:bd-text-red-200'
  ),
  warning: cn(
    'bd-border-yellow-100 bd-bg-yellow-50 bd-text-yellow-900 dark:bd-border-yellow-200/30 dark:bd-bg-yellow-700/30 dark:bd-text-yellow-200'
  ),
};

type CalloutProps = z.infer<typeof CalloutSchema>;

const CalloutSchema = z.object({
  type: z.enum(['info', 'warning', 'error']).optional().default('info'),
  emoji: z.string().optional(),
  children: z
    .custom<ReactNode>(v => isValidElement(v) || typeof v === 'string')
    .or(
      z.array(
        z.custom<ReactNode>(v => isValidElement(v) || typeof v === 'string')
      )
    ),
});

function Callout({
  type = 'info',
  emoji = TypeToEmoji[type],
  children,
}: CalloutProps): ReactElement {
  return (
    <div
      className={cn(
        'bd-overflow-x-auto bd-mt-6 bd-flex bd-rounded-lg bd-border bd-py-2 bd-pr-4',
        'contrast-more:bd-border-current contrast-more:dark:bd-border-current',
        classes[type]
      )}
    >
      <div
        className="bd-select-none bd-pl-3 bd-pr-2 bd-pt-1 bd-text-xl"
        style={{
          fontFamily:
            '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
        }}
      >
        {emoji}
      </div>
      <div className="bd-w-full bd-min-w-0 bd-leading-7">{children}</div>
    </div>
  );
}

export const MDXCallout = createMDXComponent(Callout, CalloutSchema);
