'use client';

import { useCallback, useEffect, useId, useState } from 'react';

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
  const layoutId = useId();

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
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        close();
      }
    },
    [close],
  );

  return (
    <>
      <motion.div layoutId={layoutId} className={styles.thumbnail}>
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
      </motion.div>
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
            transition={{ duration: 0.3 }}
            onClick={close}
            onWheel={handleWheel}
          >
            <figure className={styles.figure}>
              <motion.div layoutId={layoutId}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={alt} className={styles.image} />
              </motion.div>
              {alt && (
                <motion.figcaption
                  className={styles.caption}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.15, duration: 0.2 }}
                >
                  {alt}
                </motion.figcaption>
              )}
            </figure>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
