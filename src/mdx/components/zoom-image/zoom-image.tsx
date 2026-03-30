'use client';

import { useCallback, useEffect, useState } from 'react';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';

import { cn } from '@/lib/utils';

import styles from './zoom-image.module.css';

type ZoomImageProps = Omit<
  JSX.IntrinsicElements['img'],
  'srcSet' | 'width' | 'height'
>;

export function MDXZoomImage({
  className,
  alt = '',
  src,
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

  return <ZoomableImage src={src} alt={alt} className={className} {...props} />;
}

function ZoomableImage({
  src,
  alt,
  className,
  ...props
}: {
  src: string;
  alt: string;
  className?: string;
} & Record<string, unknown>) {
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, close]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      // 세로 스크롤 → 줌 닫기, 가로 스크롤 → 파노라마 이미지 탐색
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        close();
      }
    },
    [close],
  );

  return (
    <>
      <Image
        alt={alt}
        src={src}
        width={1344}
        height={768}
        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 672px"
        quality={80}
        className={cn('cursor-zoom-in rounded-lg object-cover', className)}
        onClick={() => setIsOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        {...props}
      />
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={alt}
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            onWheel={handleWheel}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img
              src={src}
              alt={alt}
              className={styles.image}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
