'use client';

import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';

import { canUseGiscusStorage } from '@/components/comments/lib/giscus-storage';
import { siteMetadata } from '@/lib/site-metadata';

export function Giscus() {
  const ref = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [storageUnavailable, setStorageUnavailable] = useState(false);

  // 테마 종류: https://github.com/giscus/giscus/tree/main/styles/themes
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    if (!ref.current || ref.current.hasChildNodes()) {
      return;
    }

    if (!canUseGiscusStorage()) {
      setStorageUnavailable(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
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

  return (
    <section className="min-h-96 w-full" ref={ref}>
      {storageUnavailable && (
        <p role="status" className="text-sm text-muted-foreground">
          브라우저 저장소를 사용할 수 없어 댓글을 불러오지 못했어요.
        </p>
      )}
    </section>
  );
}
