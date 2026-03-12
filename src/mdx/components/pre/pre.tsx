'use client';

import { useRef, type HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';
import { CopyToClipboard } from '@/mdx/common/copy-to-clipboard/copy-to-clipboard';

export function MDXPre({ children, ...props }: HTMLAttributes<HTMLPreElement>) {
  const preRef = useRef<HTMLPreElement | null>(null);

  return (
    <div className="relative">
      <pre
        ref={preRef}
        className={cn(
          'my-0 overflow-x-auto rounded-lg border border-solid border-border px-0 py-3',
          'contrast-more:border-current contrast-more:dark:border-current'
        )}
        {...props}
        tabIndex={-1}
        translate="no"
      >
        {children}
      </pre>
      <div className="absolute right-0 top-0 m-2.5 flex gap-1 opacity-0 transition focus-within:opacity-100 [div:hover>&]:opacity-100">
        <CopyToClipboard
          getValue={() =>
            preRef.current?.querySelector('code')?.textContent ?? ''
          }
        />
      </div>
    </div>
  );
}
