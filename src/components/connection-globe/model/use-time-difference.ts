'use client';

import { animate, type AnimationPlaybackControls } from 'motion/react';
import { useEffect, useState, type RefObject } from 'react';

import {
  GlobeReadiness,
  REDUCED_FADE_MS,
  TIME_DIFFERENCE_MS,
  VISIBLE_FRACTION,
  GLOBE_EASING,
} from '@/components/connection-globe/consts/playback';
import { formatTimeDifference } from '@/components/connection-globe/lib/time-difference';

export function useTimeDifference(
  ref: RefObject<HTMLParagraphElement | null>,
  minutes: number | null,
  readiness: GlobeReadiness
) {
  const [announced, setAnnounced] = useState(false);
  useEffect(() => {
    const row = ref.current;
    if (!row || minutes === null) {
      return;
    }
    const value = row.querySelector('[data-time-value]');
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let inView = false;
    let started = false;
    let finished = false;
    let counter: AnimationPlaybackControls | undefined;
    let fade: Animation | undefined;
    setAnnounced(false);
    row.dataset.timeState = 'waiting';
    const write = (progress: number) => {
      if (value) {
        value.textContent = formatTimeDifference(minutes, progress);
      }
      row.dataset.timeProgress = progress.toFixed(4);
    };
    write(0);
    const finish = () => {
      if (finished) {
        return;
      }
      finished = true;
      write(1);
      row.dataset.timeState = 'complete';
      if (fade) {
        fade.onfinish = null;
        fade.cancel();
        fade = undefined;
      }
      setAnnounced(true);
    };
    const playback = () => {
      if (finished) {
        return;
      }
      const canPlay =
        readiness === GlobeReadiness.Ready &&
        inView &&
        document.visibilityState !== 'hidden';
      if (!canPlay) {
        counter?.pause();
        fade?.pause();
        return;
      }
      if (started) {
        if (preference.matches && counter) {
          counter.stop();
          finish();
        } else {
          counter?.play();
          fade?.play();
        }
        return;
      }
      started = true;
      if (minutes === 0 || preference.matches) {
        write(1);
        row.dataset.timeState = 'fading';
        if (typeof row.animate !== 'function') {
          finish();
          return;
        }
        fade = row.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: REDUCED_FADE_MS,
          easing: GLOBE_EASING,
          fill: 'both',
        });
        fade.onfinish = finish;
      } else {
        row.dataset.timeState = 'counting';
        counter = animate(0, 1, {
          duration: TIME_DIFFERENCE_MS / 1000,
          ease: [0.19, 1, 0.22, 1],
          onUpdate: progress => {
            // Motion can deliver one scheduled sample after pause().
            if (inView && document.visibilityState !== 'hidden') {
              write(progress);
            }
          },
          onComplete: finish,
        });
      }
    };
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            entries => {
              inView = entries.some(
                entry =>
                  entry.isIntersecting &&
                  entry.intersectionRatio >= VISIBLE_FRACTION
              );
              playback();
            },
            { threshold: [0, VISIBLE_FRACTION] }
          );
    if (observer) {
      observer.observe(row);
    } else {
      inView = true;
      playback();
    }
    document.addEventListener('visibilitychange', playback);
    preference.addEventListener('change', playback);
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', playback);
      preference.removeEventListener('change', playback);
      counter?.stop();
      if (fade) {
        fade.onfinish = null;
        fade.cancel();
      }
    };
  }, [readiness, minutes, ref]);
  return announced;
}
