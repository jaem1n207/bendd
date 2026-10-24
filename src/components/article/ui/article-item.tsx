'use client';

import { motion, useAnimation, useInView } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef, useState } from 'react';

import { shouldPlayEntranceAnimation } from '@/components/article/lib/entrance-animation';
import { shuffleLetters } from '@/lib/shuffle-letters';
import type { ArticleInfo } from '@/components/article/types/article';
import { WithSound } from '@/components/sound';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';
import styles from '@/components/article/ui/article-item.module.css';

const ENTRANCE_STAGGER_SECONDS = 0.1;
const ENTRANCE_DURATION_SECONDS = 0.3;
const ENTRANCE_MAX_STAGGER_INDEX = 8;
const SHUFFLE_ITERATIONS = 10;
const SHUFFLE_FPS = 30;
const MotionLink = motion.create(Link);

function restoreText(element: HTMLElement | null, text: string) {
  if (!element) {
    return;
  }
  element.textContent = text;
  element.style.opacity = '1';
}

export function ArticleItem({
  name,
  href,
  publishedAt,
  series,
  index,
}: ArticleInfo & { index: number }) {
  const pathname = usePathname();
  // 마운트 시점에 한 번만 판정 — 이후 경로 기록이 갱신돼도 영향받지 않는다
  const [shouldAnimate] = useState(() => shouldPlayEntranceAnimation(pathname));
  const prefersReducedMotion = usePrefersReducedMotion();
  const entranceConsumed = useRef(false);
  const initiallyInViewport = useRef<boolean | undefined>(undefined);
  const itemRef = useRef<HTMLAnchorElement>(null);
  const isInView = useInView(itemRef, { once: true });
  const nameRef = useRef<HTMLHeadingElement>(null);
  const publishedAtRef = useRef<HTMLSpanElement>(null);
  const animateRow = useAnimation();

  useLayoutEffect(() => {
    const item = itemRef.current;
    if (!item) {
      return;
    }
    const restoreContent = () => {
      restoreText(nameRef.current, name);
      restoreText(publishedAtRef.current, publishedAt);
    };
    const settle = () => {
      restoreContent();
      animateRow.set({ opacity: 1 });
      item.style.opacity = '1';
      item.dataset.entrance = 'visible';
      item.dataset.lineEntrance = 'visible';
    };
    restoreContent();

    // 초기 HTML은 CSS가 표시를 보장하고, 확인된 환경에서만 셔플한다.
    if (prefersReducedMotion === undefined) {
      return;
    }
    if (prefersReducedMotion || !shouldAnimate || entranceConsumed.current) {
      entranceConsumed.current = true;
      settle();
      return;
    }

    if (initiallyInViewport.current === undefined) {
      const bounds = item.getBoundingClientRect();
      initiallyInViewport.current =
        bounds.bottom > 0 && bounds.top < window.innerHeight;
    }
    // 늦게 도착한 JS가 이미 읽을 수 있는 텍스트를 다시 숨기지 않는다.
    if (
      item.dataset.entrance === 'pending' &&
      getComputedStyle(item).opacity === '1'
    ) {
      entranceConsumed.current = true;
      settle();
      return;
    }
    if (!isInView) {
      item.dataset.entrance = 'waiting';
      return;
    }

    entranceConsumed.current = true;
    const staggerIndex = initiallyInViewport.current
      ? Math.min(index, ENTRANCE_MAX_STAGGER_INDEX)
      : 0;
    const delay = staggerIndex * ENTRANCE_STAGGER_SECONDS;
    const cancelShuffles: Array<() => void> = [];
    let cancelled = false;
    const stop = () => {
      cancelled = true;
      animateRow.stop();
      cancelShuffles.forEach(cancel => cancel());
    };
    const handleFocus = () => {
      stop();
      settle();
    };

    item.style.setProperty('--line-stagger-index', String(staggerIndex));
    // 선은 300ms 행 페이드가 끝난 뒤에도 자체 키프레임을 유지한다.
    item.dataset.lineEntrance = 'active';
    item.dataset.entrance = 'active';
    item.style.opacity = '0';
    animateRow.set({ opacity: 0 });
    void animateRow
      .start({
        opacity: [0, 1],
        transition: {
          type: 'tween',
          ease: 'linear',
          duration: ENTRANCE_DURATION_SECONDS,
          delay,
        },
      })
      .then(() => {
        if (!cancelled) {
          item.dataset.entrance = 'visible';
        }
      });

    // 셔플은 행 지연과 별개로 함께 시작한다.
    const shuffleTargets = [nameRef.current, publishedAtRef.current];
    shuffleTargets.forEach(element => {
      if (!element || getComputedStyle(element).display === 'none') {
        return;
      }
      cancelShuffles.push(
        shuffleLetters(element, {
          iterations: SHUFFLE_ITERATIONS,
          fps: SHUFFLE_FPS,
        })
      );
    });

    item.addEventListener('focus', handleFocus);
    return () => {
      item.removeEventListener('focus', handleFocus);
      // Motion 컨트롤이 먼저 해제되므로 cleanup에서는 취소만 한다.
      stop();
    };
  }, [
    isInView,
    shouldAnimate,
    prefersReducedMotion,
    index,
    name,
    publishedAt,
    animateRow,
  ]);

  return (
    <WithSound assetPath="/sounds/stapling.mp3">
      <MotionLink
        ref={itemRef}
        data-fluid-hover-item=""
        data-entrance={shouldAnimate ? 'pending' : 'visible'}
        initial={false}
        animate={animateRow}
        href={href}
        className={cn(
          styles.item,
          'relative flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-xl px-3 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-3'
        )}
      >
        <h2
          ref={nameRef}
          title={name}
          className="min-h-5 min-w-0 shrink truncate text-sm font-medium md:min-h-6 md:text-base"
        >
          {name}
        </h2>
        {series && (
          <span
            title={series.name}
            className="hidden shrink-0 whitespace-nowrap rounded-full bg-primary/10 px-2 py-0.5 text-xs tabular-nums text-primary sm:inline-block"
          >
            <span className="sr-only">{series.name} </span>#{series.order}
          </span>
        )}
        <div
          aria-hidden="true"
          className={cn(styles.line, 'min-w-4 flex-1 sm:min-w-8')}
        />
        <span
          ref={publishedAtRef}
          className="inline-block shrink-0 whitespace-nowrap text-xs tabular-nums text-muted-foreground sm:text-sm"
        >
          {publishedAt}
        </span>
      </MotionLink>
    </WithSound>
  );
}
