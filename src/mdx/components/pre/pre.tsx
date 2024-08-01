'use client';

import { useRef, type HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';
import { CopyToClipboard } from '@/mdx/common/copy-to-clipboard/copy-to-clipboard';

export function MDXPre({ children, ...props }: HTMLAttributes<HTMLPreElement>) {
  const preRef = useRef<HTMLPreElement | null>(null);

  return (
    <div className="bd-relative">
      <pre
        ref={preRef}
        className={cn(
          'bd-my-0 bd-overflow-x-auto bd-rounded-lg bd-border bd-border-solid bd-border-border bd-bg-neutral-900 bd-px-0 bd-py-3 dark:bd-bg-gray-100',
          'contrast-more:bd-border-current contrast-more:dark:bd-border-current'
        )}
        {...props}
        tabIndex={-1}
        translate="no"
      >
        {children}
      </pre>
      <div className="bd-absolute bd-right-0 bd-top-0 bd-m-2.5 bd-flex bd-gap-1 bd-opacity-0 bd-transition focus-within:bd-opacity-100 [div:hover>&]:bd-opacity-100">
        <CopyToClipboard
          getValue={() =>
            preRef.current?.querySelector('code')?.textContent ?? ''
          }
        />
      </div>
    </div>
  );
}
