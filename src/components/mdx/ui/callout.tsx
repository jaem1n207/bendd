import { isValidElement, type ReactElement, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

import {
  createMDXComponent,
  createPropValidator,
} from '../model/mdx-component-validator';

const TypeToEmoji = {
  default: '💡',
  error: '🚫',
  warning: '⚠️',
};

type CalloutType = keyof typeof TypeToEmoji;

const classes: Record<CalloutType, string> = {
  default: cn(
    'bd-border-blue-100 bd-bg-blue-50 bd-text-blue-800 dark:bd-border-blue-400/30 dark:bd-bg-blue-400/20 dark:bd-text-blue-300'
  ),
  error: cn(
    'bd-border-red-200 bd-bg-red-100 bd-text-red-900 dark:bd-border-red-200/30 dark:bd-bg-red-900/30 dark:bd-text-red-200'
  ),
  warning: cn(
    'bd-border-yellow-100 bd-bg-yellow-50 bd-text-yellow-900 dark:bd-border-yellow-200/30 dark:bd-bg-yellow-700/30 dark:bd-text-yellow-200'
  ),
};

type CalloutProps = {
  type?: CalloutType;
  emoji?: string | ReactNode;
  children: ReactNode;
};

const calloutValidator = createPropValidator<CalloutProps>(['children'], {
  type: value => ['default', 'error', 'warning'].includes(value || 'default'),
  emoji: value => typeof value === 'string' || isValidElement(value),
  children: value => isValidElement(value) || typeof value === 'string',
});

function MDXCallout({
  children,
  type = 'default',
  emoji = TypeToEmoji[type],
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

export const Callout = createMDXComponent(MDXCallout, calloutValidator);
