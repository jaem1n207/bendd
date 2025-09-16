import Image from 'next/image';

import { cn } from '@/lib/utils';

type RoundedImageProps = Omit<
  JSX.IntrinsicElements['img'],
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
  const isSvgDataUri = src.startsWith('data:image/svg+xml');
  
  if (isSvgDataUri) {
    // SVG data URI는 일반 img 태그로 처리
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={alt}
        src={src}
        className={cn('bd-mx-auto bd-rounded-lg bd-max-w-full bd-h-auto', className)}
        {...props}
      />
    );
  }

  return (
    <Image
      alt={alt}
      src={src}
      width={1344}
      height={768}
      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 672px"
      quality={80}
      className={cn('bd-rounded-lg bd-object-cover', className)}
      {...props}
    />
  );
}
