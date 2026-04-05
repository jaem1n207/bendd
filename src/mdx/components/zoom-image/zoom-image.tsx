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
  const cloneRef = useRef<HTMLImageElement>(null);
  const shouldRestoreFocus = useRef(false);
  const cloneAnimatedRef = useRef(false);
  const isClosingRef = useRef(false);
  const scrollTrackRAF = useRef<number>(0);
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
    cloneAnimatedRef.current = false;
    isClosingRef.current = false;

    // 2프레임 후 transform 적용 → CSS transition 애니메이션 + 포커스 이동
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        cloneAnimatedRef.current = true;
        setCloneAnimated(true);
        overlayRef.current?.focus();
      });
    });
  }, [src, alt]);

  const close = useCallback(() => {
    // 이미 닫기 진행 중이면 무시 (연속 wheel 이벤트로 인한 중복 호출 방지)
    if (isClosingRef.current) return;

    // 열기 애니메이션이 시작되지 않았으면 즉시 정리 (transitionEnd가 발생하지 않으므로)
    if (!cloneAnimatedRef.current) {
      document.body.style.overflow = '';
      setIsOpen(false);
      setCloneAnimated(false);
      cloneAnimatedRef.current = false;
      shouldRestoreFocus.current = true;
      setZoomState(null);
      return;
    }

    isClosingRef.current = true;

    // 스크롤이 즉시 동작하도록 overflow 복원
    document.body.style.overflow = '';

    // 닫기 transition 동안 원본 이미지 위치를 추적하여 클론 위치 동기화
    const trackImagePosition = () => {
      const img = imgRef.current;
      const clone = cloneRef.current;
      if (img && clone) {
        const newRect = img.getBoundingClientRect();
        clone.style.top = `${newRect.top}px`;
        clone.style.left = `${newRect.left}px`;
      }
      if (isClosingRef.current) {
        scrollTrackRAF.current = requestAnimationFrame(trackImagePosition);
      }
    };
    scrollTrackRAF.current = requestAnimationFrame(trackImagePosition);

    setIsOpen(false);
    setCloneAnimated(false);
    cloneAnimatedRef.current = false;
  }, [zoomState]);

  // 클론의 close transition 완료 후 정리
  const handleCloneTransitionEnd = useCallback(() => {
    if (!isOpen) {
      isClosingRef.current = false;
      cancelAnimationFrame(scrollTrackRAF.current);
      shouldRestoreFocus.current = true;
      setZoomState(null);
    }
  }, [isOpen]);

  // zoomState가 null이 된 후 React DOM commit 완료 시점에 포커스 복원
  useEffect(() => {
    if (!zoomState && shouldRestoreFocus.current) {
      shouldRestoreFocus.current = false;
      imgRef.current?.focus({ preventScroll: true });
    }
  }, [zoomState]);

  // transitionEnd가 발생하지 않는 경우를 대비한 안전장치
  useEffect(() => {
    if (isOpen || !zoomState) return;

    const timer = setTimeout(() => {
      isClosingRef.current = false;
      cancelAnimationFrame(scrollTrackRAF.current);
      shouldRestoreFocus.current = true;
      setZoomState(null);
    }, 400);

    return () => clearTimeout(timer);
  }, [isOpen, zoomState]);

  // 줌 열릴 때 키보드 리스너 등록 + 스크롤 잠금
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
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
              ref={cloneRef}
              src={zoomState.src}
              alt={zoomState.alt}
              className={styles.clone}
              onWheel={handleWheel}
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
