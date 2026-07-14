'use client';

import dynamic from 'next/dynamic';

export const BrowserDetector = dynamic(
  () =>
    import('@/components/browser-detector').then(mod => mod.BrowserDetector),
  { ssr: false }
);

export const Signature = dynamic(
  () => import('@/components/signature').then(mod => mod.Signature),
  { ssr: false }
);

export const WebMCPProvider = dynamic(
  () => import('@/components/webmcp').then(mod => mod.WebMCPProvider),
  { ssr: false }
);
