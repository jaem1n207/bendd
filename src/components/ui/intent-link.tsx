'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, type ComponentProps } from 'react';

type IntentLinkProps<T extends string> = Omit<
  ComponentProps<typeof Link<T>>,
  'href' | 'prefetch'
> & { href: Route<T> };

// 화면 진입만으로 연결된 글을 받지 않고 포인터·키보드·터치 의도를 기다린다.
export function IntentLink<T extends string>({
  href,
  onPointerEnter,
  onFocus,
  onTouchStart,
  ...props
}: IntentLinkProps<T>) {
  const router = useRouter();
  const prefetched = useRef<string | undefined>(undefined);
  const prefetch = () => {
    if (prefetched.current === href) {
      return;
    }
    prefetched.current = href;
    router.prefetch(href);
  };

  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      onPointerEnter={event => {
        onPointerEnter?.(event);
        if (!event.defaultPrevented) {
          prefetch();
        }
      }}
      onFocus={event => {
        onFocus?.(event);
        if (!event.defaultPrevented) {
          prefetch();
        }
      }}
      onTouchStart={event => {
        onTouchStart?.(event);
        if (!event.defaultPrevented) {
          prefetch();
        }
      }}
    />
  );
}
