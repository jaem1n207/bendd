import Image from 'next/image';
import React from 'react';

import { cn } from '@/lib/utils';

type RoundedImageProps = Omit<
  React.JSX.IntrinsicElements['img'],
  'srcSet' | 'width' | 'height'
>;

export function MDXRoundedImage({
  className,
  alt = '',
  src,
  ...props
}: RoundedImageProps) {
  if (!src) {
    throw new Error('src is required for RoundedImage');
  }

  // SVG data URI인지 확인
  const isSvgDataUri =
    typeof src === 'string' && src.startsWith('data:image/svg+xml');
  // GIF 이미지인지 확인
  const isGif = typeof src === 'string' && src.endsWith('.gif');

  if (isSvgDataUri) {
    // SVG data URI는 일반 img 태그로 처리
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={alt}
        src={src}
        className={cn(
          'bd:mx-auto bd:rounded-lg bd:max-w-full bd:h-auto',
          className
        )}
        {...props}
      />
    );
  }

  return (
    <Image
      alt={alt}
      src={src as string}
      width={1344}
      height={768}
      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 672px"
      quality={80}
      unoptimized={isGif}
      className={cn('bd:rounded-lg bd:object-cover', className)}
      {...props}
    />
  );
}
