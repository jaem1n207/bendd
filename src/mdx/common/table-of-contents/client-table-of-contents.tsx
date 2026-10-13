'use client';

import dynamic from 'next/dynamic';

export const ClientTableOfContents = dynamic(
  () =>
    import('@/mdx/common/table-of-contents/table-of-contents').then(
      mod => mod.TableOfContents
    ),
  {
    ssr: false,
  }
);
