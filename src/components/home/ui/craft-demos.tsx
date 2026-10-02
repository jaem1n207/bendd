'use client';

import { RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';

import styles from '@/components/home/ui/home-studio.module.css';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { shuffleLetters } from '@/lib/shuffle-letters';

const ORIGINAL = '안녕, World! 2026 :)';

export function TextShuffleDemo() {
  const reducedMotion = usePrefersReducedMotion();
  const text = useRef<HTMLSpanElement>(null);
  const cancelShuffle = useRef<(() => void) | undefined>(undefined);
  const stop = useCallback(() => {
    cancelShuffle.current?.();
    cancelShuffle.current = undefined;
    if (text.current) {
      text.current.textContent = ORIGINAL;
    }
  }, []);
  useEffect(() => {
    stop();
    return stop;
  }, [reducedMotion, stop]);

  const shuffle = () => {
    stop();
    if (reducedMotion !== false || !text.current) {
      return;
    }
    cancelShuffle.current = shuffleLetters(text.current, {
      iterations: 8,
      fps: 30,
      onComplete: () => {
        cancelShuffle.current = undefined;
      },
    });
  };

  return (
    <div className={`${styles.craftStage} ${styles.shuffleStage}`}>
      <span className={styles.stageLabel}>TEXT / UNICODE</span>
      <button
        type="button"
        className={styles.shuffleButton}
        onClick={shuffle}
        onPointerEnter={event => {
          if (event.pointerType === 'mouse') {
            shuffle();
          }
        }}
        aria-label="텍스트 셔플 애니메이션 재생"
      >
        <span className={styles.shuffleText} data-label={ORIGINAL}>
          <span ref={text} aria-hidden="true">
            {ORIGINAL}
          </span>
        </span>
      </button>
      <span className={styles.demoHint}>
        <RotateCcw aria-hidden="true" />
        {reducedMotion ? '동작 줄이기 사용 중' : '올리거나 눌러 보세요'}
      </span>
    </div>
  );
}
