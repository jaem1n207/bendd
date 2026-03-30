'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import Image from 'next/image';

import { cn } from '@/lib/utils';

import styles from './zoom-image.module.css';

// medium-zoom과 동일한 타이밍
const DURATION = '300ms';
const EASING = 'cubic-bezier(0.2, 0, 0.2, 1)';
const TRANSITION = `transform ${DURATION} ${EASING}`;

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
  const imgRef = useRef<HTMLImageElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [overlayMounted, setOverlayMounted] = useState(false);
  const [imgStyle, setImgStyle] = useState<React.CSSProperties>({});

  const open = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    const margin = 32;

    // 비율 유지하며 뷰포트를 거의 채움
    const scaleX = (viewW - margin * 2) / rect.width;
    const scaleY = (viewH - margin * 2) / rect.height;
    const scale = Math.min(scaleX, scaleY);

    // 현재 중심에서 뷰포트 중심까지의 이동량
    const tx = viewW / 2 - (rect.left + rect.width / 2);
    const ty = viewH / 2 - (rect.top + rect.height / 2);

    setOverlayMounted(true);
    setIsOpen(true);

    // 다음 프레임에서 transform 적용 → CSS transition이 애니메이션 처리
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setImgStyle({
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transition: TRANSITION,
          zIndex: 51,
          position: 'relative',
          cursor: 'zoom-out',
          willChange: 'transform',
        });
      });
    });
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setImgStyle((prev) => ({
      ...prev,
      transform: 'translate(0, 0) scale(1)',
      cursor: 'zoom-in',
    }));
  }, []);

  // transform 전환 완료 후 오버레이 제거 + 인라인 스타일 정리
  const handleTransitionEnd = useCallback(() => {
    if (!isOpen) {
      setOverlayMounted(false);
      setImgStyle({});
    }
  }, [isOpen]);

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
      <Image
        ref={imgRef}
        alt={alt}
        src={src}
        width={1344}
        height={768}
        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 672px"
        quality={80}
        className={cn('w-full cursor-zoom-in rounded-lg object-cover', className)}
        style={imgStyle}
        onClick={isOpen ? close : open}
        onTransitionEnd={handleTransitionEnd}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isOpen) close();
            else open();
          }
        }}
        {...props}
      />
      {overlayMounted && (
        <div
          className={styles.overlay}
          style={{
            opacity: isOpen ? 1 : 0,
            transition: `opacity ${DURATION} ${EASING}`,
          }}
          onClick={close}
          onWheel={handleWheel}
          role="dialog"
          aria-modal="true"
          aria-label={alt}
        >
          {alt && <span className={styles.caption}>{alt}</span>}
        </div>
      )}
    </>
  );
}
