import type { Metadata } from 'next';

import { siteMetadata } from '@/lib/site-metadata';
import type { Article } from '@/mdx/mdx';

export function getOpenGraphVideos({
  video,
  videoWidth,
  videoHeight,
}: Article['metadata']): NonNullable<Metadata['openGraph']>['videos'] {
  if (!video) {
    return undefined;
  }

  const url = new URL(video, siteMetadata.siteUrl).href;

  return [
    {
      url,
      secureUrl: url,
      type: video.endsWith('.webm') ? 'video/webm' : 'video/mp4',
      width: videoWidth,
      height: videoHeight,
    },
  ];
}
