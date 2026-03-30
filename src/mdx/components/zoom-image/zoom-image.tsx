'use client';

import Image from 'next/image';
import Zoom from 'react-medium-image-zoom';

import { cn } from '@/lib/utils';

import 'react-medium-image-zoom/dist/styles.css';

type ZoomImageProps = Omit<
  JSX.IntrinsicElements['img'],
  'srcSet' | 'width' | 'height'
>;

export function MDXZoomImage({
  className,
  alt = '',
  src,
  title,
  ...props
}: ZoomImageProps) {
  if (!src) {
    throw new Error('src is required for ZoomImage');
  }

  const isSvgDataUri = src.startsWith('data:image/svg+xml');

  if (isSvgDataUri) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={alt}
        src={src}
        className={cn('mx-auto max-w-full rounded-lg', className)}
        {...props}
      />
    );
  }

  const image = (
    <Image
      alt={alt}
      src={src}
      width={1344}
      height={768}
      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 672px"
      quality={80}
      className={cn('rounded-lg object-cover', className)}
      {...props}
    />
  );

  // title이 있으면 새 탭에서 전체 크기로 열기 (파노라마 이미지 등 줌이 비효율적인 경우)
  if (title) {
    return (
      <a href={src} target="_blank" rel="noopener noreferrer" title={title}>
        {image}
      </a>
    );
  }

  return <Zoom>{image}</Zoom>;
}
