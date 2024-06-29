'use client';

import { useTheme } from 'next-themes';
import { useEffect, useRef } from 'react';

import { siteMetadata } from '@/lib/site-metadata';

export function Giscus() {
  const ref = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  // 테마 종류: https://github.com/giscus/giscus/tree/main/styles/themes
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    if (!ref.current || ref.current.hasChildNodes()) return;

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymouse';
    script.setAttribute('data-repo', 'jaem1n207/bendd');
    script.setAttribute('data-repo-id', 'R_kgDOL-MLOQ');
    script.setAttribute('data-category', 'Comments');
    script.setAttribute('data-category-id', 'DIC_kwDOL-MLOc4Cgd1Q');
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', theme);
    script.setAttribute('data-lang', siteMetadata.language);
    script.setAttribute('data-loading', 'lazy');

    ref.current.appendChild(script);
  }, [theme]);

  // 테마가 변경되면 giscus iframe을 찾아서 테마 변경을 요청합니다.
  // https://github.com/giscus/giscus/blob/main/ADVANCED-USAGE.md#isetconfigmessage
  useEffect(() => {
    const iframe = document.querySelector<HTMLIFrameElement>(
      'iframe.giscus-frame'
    );
    iframe?.contentWindow?.postMessage(
      { giscus: { setConfig: { theme } } },
      'https://giscus.app'
    );
  }, [theme]);

  return <section className="bd-min-h-96 bd-w-full" ref={ref} />;
}
