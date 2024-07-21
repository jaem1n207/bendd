import type { ComponentProps, SVGProps } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { isEmptyString } from '@/lib/assertions';
import { cn } from '@/lib/utils';

export const CopyToClipboard = ({
  getValue,
  className,
  ...props
}: {
  getValue: () => string;
} & ComponentProps<'button'>) => {
  const [isCopied, setCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) return;
    const timerId = setTimeout(() => {
      setCopied(false);
    }, 2000);

    return () => {
      clearTimeout(timerId);
    };
  }, [isCopied]);

  const handleClick = useCallback<
    NonNullable<ComponentProps<'button'>['onClick']>
  >(async () => {
    const copyText = getValue();

    try {
      if (!navigator?.clipboard) {
        throw new Error('복사 기능을 지원하지 않는 브라우저에요.');
      }
      if (isEmptyString(copyText)) {
        throw new Error('복사할 내용이 없어요.');
      }

      setCopied(true);
      await navigator.clipboard.writeText(copyText);
    } catch (error) {
      toast('클립보드에 복사하는데 실패했어요.', {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }, [getValue]);

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClick}
      title="Copy to clipboard"
      className={cn('bd-group hover:[--active:1]', className)}
      {...props}
      data-copied={isCopied}
    >
      <ClipBoard className="bd-pointer-events-none bd-size-5" />
      <span className="bd-sr-only">Copy</span>
    </Button>
  );
};

function ClipBoard({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        'bd-overflow-visible',
        '[--bg:canvas] [--control:canvas]',
        '[&>path]:[transform-box:fill-box] [&>path]:bd-origin-center',
        className
      )}
      {...props}
    >
      <path
        className={cn(
          'bd-fill-[var(--bg)] group-hover:bd-fill-[var(--control)] group-focus-visible:bd-fill-[var(--control)]',
          'bd-rotate-[5deg] group-data-[copied=true]:bd-rotate-0',
          'bd-translate-x-[calc(20%+(var(--active,0)*-5%))] bd-translate-y-[-8%] group-data-[copied=true]:bd-translate-x-0 group-data-[copied=true]:bd-translate-y-0',
          'bd-transition-[transform,rotate] bd-duration-200'
        )}
        d="M15.666 3.888a2.25022 2.25022 0 0 0-.808-1.18262A2.25011 2.25011 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612a.74983.74983 0 0 1-.2197.53033A.74987.74987 0 0 1 15 5.25H9a.75001.75001 0 0 1-.75-.75c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5c0 .5967-.2371 1.169-.659 1.591a2.2504 2.2504 0 0 1-1.591.659H6.75a2.25023 2.25023 0 0 1-1.59099-.659A2.25015 2.25015 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.21804 48.21804 0 0 1 1.927-.184"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className={cn(
          'bd-fill-[var(--bg)] group-hover:bd-fill-[var(--control)] group-focus-visible:bd-fill-[var(--control)]',
          'bd-rotate-[-5deg] group-data-[copied=true]:bd-rotate-0',
          'bd-translate-x-[calc(-50%+(var(--active,0)*25%))] bd-translate-y-[calc(25%-(var(--active,0)*10%))] group-data-[copied=true]:bd-translate-x-0 group-data-[copied=true]:bd-translate-y-0',
          'bd-transition-[transform,rotate] bd-duration-200'
        )}
        d="M10.75 8H7.9375C7.42 8 7 8.41067 7 8.91667v9.16663c0 .506.42.9167.9375.9167h8.125c.5175 0 .9375-.4107.9375-.9167v-1.5277M10.75 8h5.3125C16.58 8 17 8.41067 17 8.91667v7.63893"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className={cn(
          'group-data-[copied=true]:[stroke-dashoffset:0]',
          'bd-transition-[stroke-dashoffset] bd-duration-200 group-data-[copied=true]:bd-delay-200'
        )}
        pathLength="1"
        d="m10.125 14.1146 1.25 1.2222 2.5-3.0556"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={1}
        strokeDashoffset={1}
      />
    </svg>
  );
}
