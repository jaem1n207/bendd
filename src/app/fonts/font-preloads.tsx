'use client';

import { usePathname } from 'next/navigation';

import { fontPreloads } from '@/app/fonts/generated';

export function FontPreloads() {
  const fonts =
    usePathname() === '/' ? fontPreloads.homeGlobal : fontPreloads.global;

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
