'use client';

import { usePathname } from 'next/navigation';

import { fontPreloads } from '@/app/fonts/generated';

export function FontPreloads() {
  // 비홈의 추가 preload는 FCP를 지연시켜 원래의 CSS 발견 경로를 유지한다.
  const fonts =
    usePathname() === '/'
      ? [...fontPreloads.homeGlobal, ...fontPreloads.home]
      : [];

  return (
    <>
      {fonts.map(href => (
        <link
          key={href}
          rel="preload"
          href={href}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      ))}
    </>
  );
}
