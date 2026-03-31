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
  // 이미지가 fixed로 전환될 때 레이아웃 점프 방지용 플레이스홀더
  const [placeholderStyle, setPlaceholderStyle] =
    useState<React.CSSProperties>({});

  const open = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const { naturalWidth, naturalHeight } = img;
    const viewW = document.documentElement.clientWidth;
    const viewH = document.documentElement.clientHeight;
    const margin = 32;

    // medium-zoom 공식: 뷰포트에 맞추되 원본 크기를 초과하지 않음
    const scaleX =
      Math.min(naturalWidth || viewW, viewW - margin * 2) / rect.width;
    const scaleY =
      Math.min(naturalHeight || viewH, viewH - margin * 2) / rect.height;
    const scale = Math.min(scaleX, scaleY) || 1;

    // translate는 scale보다 먼저 적용됨 (오른쪽→왼쪽)
    // 실제 이동 = translate * scale, 그래서 scale로 나눔
    const translateX = (-rect.left + (viewW - rect.width) / 2) / scale;
    const translateY = (-rect.top + (viewH - rect.height) / 2) / scale;

    // 레이아웃 점프 방지: 원래 이미지 자리를 예약
    setPlaceholderStyle({ width: rect.width, height: rect.height });
    setOverlayMounted(true);
    setIsOpen(true);

    // 다음 프레임: position: fixed로 전환 후 transform 적용
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setImgStyle({
          position: 'fixed',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          margin: 0,
          transform: `scale(${scale}) translate3d(${translateX}px, ${translateY}px, 0)`,
          transition: TRANSITION,
          zIndex: 51,
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
      transform: 'scale(1) translate3d(0, 0, 0)',
      cursor: 'zoom-in',
    }));
  }, []);

  // transform 전환 완료 후 정리
  const handleTransitionEnd = useCallback(() => {
    if (!isOpen) {
      setOverlayMounted(false);
      setImgStyle({});
      setPlaceholderStyle({});
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
      <div style={placeholderStyle} />
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
