'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import Image from 'next/image';
import { z } from 'zod';

import { cn } from '@/lib/utils';

import { createMDXComponent } from '../../common/create-mdx-component';
import styles from './zoom-image.module.css';

// medium-zoom과 동일한 타이밍
const DURATION = '300ms';
const EASING = 'cubic-bezier(0.2, 0, 0.2, 1)';
const TRANSITION = `transform ${DURATION} ${EASING}`;

const ZoomImageSchema = z.object({
  src: z.string().optional(),
  alt: z.string().optional(),
  className: z.string().optional(),
});

type ZoomImageProps = Omit<
  JSX.IntrinsicElements['img'],
  'srcSet' | 'width' | 'height'
>;

function MDXZoomImageBase({
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

export const MDXZoomImage = createMDXComponent(
  MDXZoomImageBase,
  ZoomImageSchema,
);

interface ZoomState {
  src: string;
  alt: string;
  rect: DOMRect;
  transform: string;
  closeTransform: string;
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
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [zoomState, setZoomState] = useState<ZoomState | null>(null);
  // 클론 이미지의 transform이 적용됐는지 (2프레임 대기 후)
  const [cloneAnimated, setCloneAnimated] = useState(false);

  const open = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const viewW = document.documentElement.clientWidth;
    const viewH = document.documentElement.clientHeight;
    const margin = 32;

    const scaleX = (viewW - margin * 2) / rect.width;
    const scaleY = (viewH - margin * 2) / rect.height;
    const scale = Math.min(scaleX, scaleY) || 1;

    const translateX = (-rect.left + (viewW - rect.width) / 2) / scale;
    const translateY = (-rect.top + (viewH - rect.height) / 2) / scale;

    setZoomState({
      src,
      alt,
      rect,
      transform: `scale(${scale}) translate3d(${translateX}px, ${translateY}px, 0)`,
      closeTransform: 'scale(1) translate3d(0, 0, 0)',
    });
    setIsOpen(true);
    setCloneAnimated(false);

    // 2프레임 후 transform 적용 → CSS transition 애니메이션 + 포커스 이동
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setCloneAnimated(true);
        overlayRef.current?.focus();
      });
    });
  }, [src, alt]);

  const close = useCallback(() => {
    // 스크롤로 닫을 때 원본 이미지의 현재 위치에 맞게 클론 복귀 위치 재계산
    const img = imgRef.current;
    if (img && zoomState) {
      const newRect = img.getBoundingClientRect();
      const deltaX = newRect.left - zoomState.rect.left;
      const deltaY = newRect.top - zoomState.rect.top;
      setZoomState((prev) =>
        prev
          ? {
              ...prev,
              closeTransform: `scale(1) translate3d(${deltaX}px, ${deltaY}px, 0)`,
            }
          : null,
      );
    }
    setIsOpen(false);
    setCloneAnimated(false);
  }, [zoomState]);

  // 클론의 close transition 완료 후 정리 + 포커스 복원
  const handleCloneTransitionEnd = useCallback(() => {
    if (!isOpen) {
      setZoomState(null);
      imgRef.current?.focus();
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
        className={cn(
          'w-full cursor-zoom-in rounded-lg object-cover',
          className,
        )}
        style={zoomState ? { visibility: 'hidden' } : undefined}
        onClick={open}
        role="button"
        aria-label={alt ? `${alt} - 클릭하여 확대` : '이미지 클릭하여 확대'}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
          }
        }}
        {...props}
      />
      {zoomState &&
        createPortal(
          <>
            <div
              ref={overlayRef}
              className={styles.overlay}
              style={{
                opacity: isOpen ? 1 : 0,
                transition: `opacity ${DURATION} ${EASING}`,
              }}
              onClick={close}
              onWheel={handleWheel}
              role="dialog"
              aria-modal="true"
              aria-label={alt || '이미지 확대 보기'}
              tabIndex={-1}
            >
              {alt && <span className={styles.caption}>{alt}</span>}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomState.src}
              alt={zoomState.alt}
              className={styles.clone}
              style={{
                top: zoomState.rect.top,
                left: zoomState.rect.left,
                width: zoomState.rect.width,
                height: zoomState.rect.height,
                transform:
                  isOpen && cloneAnimated
                    ? zoomState.transform
                    : zoomState.closeTransform,
                transition: TRANSITION,
              }}
              onClick={close}
              onTransitionEnd={handleCloneTransitionEnd}
            />
          </>,
          document.body,
        )}
    </>
  );
}
