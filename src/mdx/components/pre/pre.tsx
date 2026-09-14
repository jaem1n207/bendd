'use client';

import { useRef, type HTMLAttributes } from 'react';

import { useScrollFade } from '@/hooks/use-scroll-fade';
import { cn } from '@/lib/utils';
import { CopyToClipboard } from '@/mdx/common/copy-to-clipboard/copy-to-clipboard';

export function MDXPre({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLPreElement>) {
  const preRef = useRef<HTMLPreElement | null>(null);
  useScrollFade(preRef, 'x');

  return (
    <div
      data-code-block-frame
      className="relative rounded-lg border border-solid border-border contrast-more:border-current contrast-more:dark:border-current"
    >
      <pre
        ref={preRef}
        data-webmcp-code-block
        className={cn(
          'scroll-fade-x my-0 overflow-x-auto rounded-[inherit] bg-transparent px-0 py-3 [--scroll-fade-reveal:32px] [--scroll-fade-size:16px]',
          className
        )}
        {...props}
        tabIndex={0}
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
