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
