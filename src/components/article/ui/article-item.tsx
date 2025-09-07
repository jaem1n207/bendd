'use client';

import { motion, useAnimate, useInView } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { shuffleLetters } from '@/components/article/lib/shuffle-letters';
import { WithSound } from '@/components/sound';
import { cn } from '@/lib/utils';

import type { ArticleInfo } from '../types/article';

const MotionLink = motion(Link);

export function ArticleItem({
  name,
  summary,
  href,
  publishedAt,
  index,
}: ArticleInfo & { index: number }) {
  const itemRef = useRef<HTMLAnchorElement>(null);
  const isInView = useInView(itemRef, { once: true, margin: '-100px 0px' });
  const [nameRef, animateName] = useAnimate();
  const [summaryRef, animateSummary] = useAnimate();
  const [lineRef, animateLine] = useAnimate();
  const [publishedAtRef, animatePublishedAt] = useAnimate();

  useEffect(() => {
    if (isInView) {
      const delay = index * 0.15;
      const duration = 1;

      animateName(nameRef.current, { opacity: [0, 1] }, { duration, delay });
      if (nameRef.current) {
        shuffleLetters(nameRef.current, {
          iterations: 10,
        });
      }

      animateSummary(
        summaryRef.current,
        { opacity: [0, 1] },
        { duration, delay }
      );
      if (summaryRef.current) {
        shuffleLetters(summaryRef.current, {
          iterations: 15,
        });
      }

      animateLine(
        lineRef.current,
        { scaleX: [0, 1], opacity: [1, 0.5] },
        {
          duration,
          delay,
          type: 'spring',
        }
      );

      animatePublishedAt(
        publishedAtRef.current,
        { opacity: [0, 1] },
        { duration, delay }
      );
      if (publishedAtRef.current) {
        shuffleLetters(publishedAtRef.current);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView]);

  return (
    <WithSound assetPath="/sounds/stapling.mp3">
      <MotionLink
        target="_blank"
        ref={itemRef}
        href={href}
        className={cn("bd-relative -bd-m-3 bd-block bd-w-[calc(100%+1rem)] bd-overflow-hidden bd-rounded-xl bd-px-3 bd-py-4 hover:bd-bg-gray-300 sm:bd-flex sm:bd-items-center sm:bd-gap-3"
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.h2
          ref={nameRef}
          className="bd-overflow-hidden bd-whitespace-nowrap bd-text-sm bd-font-medium md:bd-text-base"
        >
          {name}
        </motion.h2>
        <motion.span
          ref={summaryRef}
          className="-bd-ml-1.5 bd-hidden bd-overflow-hidden bd-whitespace-nowrap bd-text-sm bd-text-muted-foreground/90 sm:bd-inline-block"
        >
          {summary}
        </motion.span>
        <motion.div
          ref={lineRef}
          className="bd-hidden bd-h-px bd-origin-left bd-bg-gray-700 sm:bd-inline-block sm:bd-flex-1"
        />
        <motion.span
          ref={publishedAtRef}
          className="bd-text-sm bd-tabular-nums bd-text-muted-foreground/70"
        >
          {publishedAt}
        </motion.span>
      </MotionLink>
    </WithSound>
  );
}
