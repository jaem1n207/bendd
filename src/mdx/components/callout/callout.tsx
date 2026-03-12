import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { z } from 'zod';

import { cn } from '@/lib/utils';

import { createMDXComponent } from '../../common/create-mdx-component';

const TypeToEmoji = {
  info: '💡',
  error: '🚫',
  warning: '⚠️',
};

type CalloutType = keyof typeof TypeToEmoji;

const classes: Record<CalloutType, string> = {
  info: cn(
    'border-blue-100 bg-blue-50/80 text-blue-800 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-300'
  ),
  error: cn(
    'border-red-200 bg-red-50/80 text-red-900 dark:border-red-200/30 dark:bg-red-500/10 dark:text-red-200'
  ),
  warning: cn(
    'border-yellow-100 bg-yellow-50/80 text-yellow-900 dark:border-yellow-200/30 dark:bg-yellow-500/10 dark:text-yellow-200'
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
        'overflow-x-auto mt-6 flex rounded-lg border py-2 pr-4',
        'contrast-more:border-current contrast-more:dark:border-current',
        classes[type]
      )}
    >
      <div
        className="select-none pl-3 pr-2 pt-1 text-xl"
        style={{
          fontFamily:
            '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
        }}
      >
        {emoji}
      </div>
      <div className="w-full min-w-0 leading-7 [&>p]:!my-0">{children}</div>
    </div>
  );
}

export const MDXCallout = createMDXComponent(Callout, CalloutSchema);
