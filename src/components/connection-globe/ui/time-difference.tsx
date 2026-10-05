'use client';

import { useMemo, useRef } from 'react';

import { GlobeReadiness } from '@/components/connection-globe/consts/playback';
import {
  formatTimeDifference,
  timeDifferenceSentence,
} from '@/components/connection-globe/lib/time-difference';
import { useTimeDifference } from '@/components/connection-globe/model/use-time-difference';
import styles from '@/components/connection-globe/ui/connection-globe.module.css';
import { seoulTimeDifference } from '@/lib/time-zone';

export function TimeDifference({
  timeZone,
  readiness,
}: {
  timeZone?: string;
  readiness: GlobeReadiness;
}) {
  const minutes = useMemo(() => seoulTimeDifference(timeZone), [timeZone]);
  const ref = useRef<HTMLParagraphElement>(null);
  const announced = useTimeDifference(ref, minutes, readiness);
  if (minutes === null) {
    return null;
  }
  return (
    <p
      ref={ref}
      className={styles.timeDifference}
      data-time-difference
      data-time-state="waiting"
    >
      <span aria-hidden="true">
        {minutes === 0 ? (
          timeDifferenceSentence(minutes)
        ) : (
          <>
            서울은{' '}
            <strong className={styles.timeValue}>
              <span className={styles.timeMeasure}>
                {formatTimeDifference(minutes)}
              </span>
              <span data-time-value>{formatTimeDifference(minutes, 0)}</span>
            </strong>{' '}
            {minutes > 0 ? '빠르네요.' : '느리네요.'}
          </>
        )}
      </span>
      <span
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        data-time-announcement
      >
        {announced ? timeDifferenceSentence(minutes) : ''}
      </span>
    </p>
  );
}
