'use client';

import { motion, useAnimation, useInView } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { shouldPlayEntranceAnimation } from '@/components/article/lib/entrance-animation';
import { shuffleLetters } from '@/lib/shuffle-letters';
import type { ArticleInfo } from '@/components/article/types/article';
import { WithSound } from '@/components/sound';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';

const ENTRANCE_STAGGER_SECONDS = 0.15;
const ENTRANCE_DURATION_SECONDS = 1;
const NAME_SHUFFLE_ITERATIONS = 10;
const SUMMARY_SHUFFLE_ITERATIONS = 15;

function restoreText(element: HTMLElement | null, text: string) {
  if (!element) {
    return;
  }
  element.textContent = text;
  element.style.opacity = '1';
}

export function ArticleItem({
  name,
  summary,
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
  const itemRef = useRef<HTMLAnchorElement>(null);
  const isInView = useInView(itemRef, { once: true, margin: '-100px 0px' });
  const nameRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLSpanElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const publishedAtRef = useRef<HTMLSpanElement>(null);
  const animateName = useAnimation();
  const animateSummary = useAnimation();
  const animateLine = useAnimation();
  const animatePublishedAt = useAnimation();

  useEffect(() => {
    const settle = () => {
      restoreText(nameRef.current, name);
      restoreText(summaryRef.current, summary);
      restoreText(publishedAtRef.current, publishedAt);
      if (lineRef.current) {
        lineRef.current.style.opacity = '0.5';
        lineRef.current.style.transform = 'scaleX(1)';
      }
    };
    // 예약된 Motion 렌더가 중단 전 opacity/scale을 복원하지 않도록 함께 정착한다.
    animateName.set({ opacity: 1 });
    animateSummary.set({ opacity: 1 });
    animatePublishedAt.set({ opacity: 1 });
    animateLine.set({ scaleX: 1, opacity: 0.5 });
    settle();

    if (prefersReducedMotion === true) {
      entranceConsumed.current = true;
    }
    if (
      prefersReducedMotion !== false ||
      !shouldAnimate ||
      !isInView ||
      entranceConsumed.current
    ) {
      return;
    }

    entranceConsumed.current = true;

    const delay = index * ENTRANCE_STAGGER_SECONDS;
    const duration = ENTRANCE_DURATION_SECONDS;
    // 언마운트 후에도 셔플 애니메이션이 분리된 DOM을 계속 변경하지 않도록 정리
    const cancelShuffles: Array<() => void> = [];

    void animateName.start({
      opacity: [0, 1],
      transition: { duration, delay },
    });
    void animateSummary.start({
      opacity: [0, 1],
      transition: { duration, delay },
    });
    void animateLine.start({
      scaleX: [0, 1],
      opacity: [1, 0.5],
      transition: { duration, delay, type: 'spring' },
    });
    void animatePublishedAt.start({
      opacity: [0, 1],
      transition: { duration, delay },
    });
    if (nameRef.current) {
      cancelShuffles.push(
        shuffleLetters(nameRef.current, {
          iterations: NAME_SHUFFLE_ITERATIONS,
        })
      );
    }

    if (summaryRef.current) {
      cancelShuffles.push(
        shuffleLetters(summaryRef.current, {
          iterations: SUMMARY_SHUFFLE_ITERATIONS,
        })
      );
    }

    if (publishedAtRef.current) {
      cancelShuffles.push(shuffleLetters(publishedAtRef.current));
    }

    return () => {
      [animateName, animateSummary, animateLine, animatePublishedAt].forEach(
        control => control.stop()
      );
      cancelShuffles.forEach(cancel => cancel());
      settle();
    };
  }, [
    isInView,
    shouldAnimate,
    prefersReducedMotion,
    index,
    name,
    summary,
    publishedAt,
    nameRef,
    summaryRef,
    lineRef,
    publishedAtRef,
    animateName,
    animateSummary,
    animateLine,
    animatePublishedAt,
  ]);

  return (
    <WithSound assetPath="/sounds/stapling.mp3">
      <Link
        ref={itemRef}
        data-fluid-hover-item=""
        href={href}
        className={cn(
          'relative block w-full overflow-hidden rounded-xl px-3 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex sm:min-w-0 sm:items-center sm:gap-3'
        )}
      >
        <motion.h2
          ref={nameRef}
          animate={animateName}
          className="min-w-0 shrink truncate text-sm font-medium md:text-base"
        >
          {name}
        </motion.h2>
        {series && (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-primary/10 px-2 py-0.5 text-xs tabular-nums text-primary">
            {series.name} #{series.order}
          </span>
        )}
        <motion.span
          ref={summaryRef}
          animate={animateSummary}
          className="hidden min-w-0 shrink truncate text-sm text-muted-foreground sm:inline-block"
        >
          {summary}
        </motion.span>
        <motion.div
          ref={lineRef}
          animate={animateLine}
          className="hidden h-px min-w-8 origin-left bg-gray-700 sm:inline-block sm:flex-1"
          style={{ opacity: 0.5 }}
        />
        <motion.span
          ref={publishedAtRef}
          animate={animatePublishedAt}
          className="shrink-0 whitespace-nowrap text-sm tabular-nums text-muted-foreground"
        >
          {publishedAt}
        </motion.span>
      </Link>
    </WithSound>
  );
}
