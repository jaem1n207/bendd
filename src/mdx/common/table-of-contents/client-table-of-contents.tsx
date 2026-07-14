'use client';

import dynamic from 'next/dynamic';

import { SkeletonTableOfContents } from '@/mdx/common/table-of-contents/skeleton-table-of-contents';

export const ClientTableOfContents = dynamic(
  () =>
    import('@/mdx/common/table-of-contents/table-of-contents').then(
      mod => mod.TableOfContents
    ),
  {
    ssr: false,
    loading: SkeletonTableOfContents,
  }
);
