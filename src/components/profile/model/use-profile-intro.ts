'use client';

import { useLayoutEffect, type RefObject } from 'react';

import { HOME_REVEAL_COMPLETE } from '@/lib/home-reveal-events';

export enum ProfilePlayback {
  Automatic = 'automatic',
  Manual = 'manual',
}

enum VisibilityRequirement {
  Partial = 'partial',
  Full = 'full',
}

interface ProfileIntroOptions {
  rootRef: RefObject<HTMLElement | null>;
  feedbackRef: RefObject<HTMLButtonElement | null>;
  timingRef: RefObject<HTMLButtonElement | null>;
  playFeedback: (playback: ProfilePlayback) => void;
  stopFeedback: () => void;
  playTiming: () => void;
  stopTiming: () => void;
}

function inViewport(
  element: HTMLElement,
  requirement = VisibilityRequirement.Partial
) {
  const bounds = element.getBoundingClientRect();
  return (
    bounds.width > 0 &&
    bounds.height > 0 &&
    (requirement === VisibilityRequirement.Full
      ? bounds.top >= 0 &&
        bounds.bottom <= window.innerHeight &&
        bounds.left >= 0 &&
        bounds.right <= window.innerWidth
      : bounds.bottom > 0 &&
        bounds.top < window.innerHeight &&
        bounds.right > 0 &&
        bounds.left < window.innerWidth)
  );
}

export function useProfileIntro({
  rootRef,
  feedbackRef,
  timingRef,
  playFeedback,
  stopFeedback,
  playTiming,
  stopTiming,
}: ProfileIntroOptions) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    const feedback = feedbackRef.current;
    const timing = timingRef.current;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    if (!root || !feedback || !timing || preference.matches) {
      return;
    }

    const candidates = [
      {
        element: feedback,
        play: () => playFeedback(ProfilePlayback.Automatic),
        stop: stopFeedback,
        duration: 620,
        ready: false,
        played: false,
      },
      {
        element: timing,
        play: playTiming,
        stop: stopTiming,
        duration: 720,
        ready: false,
        played: false,
      },
    ];
    let current: (typeof candidates)[number] | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const hasVisibleEntrance = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          '[data-reveal-state="initial"], [data-reveal-state="entering"]'
        )
      ).some(element => inViewport(element));
    const available = () =>
      candidates.find(
        candidate =>
          candidate.ready &&
          !candidate.played &&
          inViewport(candidate.element, VisibilityRequirement.Full)
      );
    const schedule = () => {
      if (stopped || current || timer || hasVisibleEntrance() || !available()) {
        return;
      }
      timer = setTimeout(() => {
        timer = undefined;
        if (
          stopped ||
          preference.matches ||
          document.hidden ||
          hasVisibleEntrance()
        ) {
          return;
        }
        // A scroll during the pause can change which phrase is actually visible.
        // Do not spend its one playback until the phrase can be seen in full.
        const next = available();
        if (!next) {
          return;
        }
        next.played = true;
        current = next;
        next.play();
        timer = setTimeout(() => {
          timer = undefined;
          current = undefined;
          schedule();
        }, next.duration);
      }, 120);
    };
    const observer =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(schedule, { threshold: [0, 1] })
        : undefined;
    candidates.forEach(candidate => observer?.observe(candidate.element));

    const stop = () => {
      stopped = true;
      clearTimeout(timer);
      timer = undefined;
      observer?.disconnect();
      current?.stop();
      current = undefined;
    };
    const onReveal = (event: Event) => {
      candidates.forEach(candidate => {
        if (candidate.element.closest('[data-reveal]') === event.target) {
          candidate.ready = true;
        }
      });
      schedule();
    };
    const onHover = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        candidates.some(candidate => candidate.element.contains(target))
      ) {
        stop();
      }
    };
    const onControl = (event: Event) => {
      if (
        event.target instanceof Element &&
        event.target.closest(
          'a[href], button, input, select, textarea, [tabindex]'
        )
      ) {
        stop();
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        stop();
      }
    };
    const onPreference = () => {
      if (preference.matches) {
        stop();
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      }
    };
    let dark = document.documentElement.classList.contains('dark');
    const themeObserver = new MutationObserver(() => {
      const next = document.documentElement.classList.contains('dark');
      if (next !== dark) {
        stop();
      }
      dark = next;
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    root.addEventListener(HOME_REVEAL_COMPLETE, onReveal);
    root.addEventListener('pointerover', onHover);
    document.addEventListener('click', onControl, true);
    document.addEventListener('focusin', onControl);
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', stop);
    preference.addEventListener('change', onPreference);
    return () => {
      stop();
      themeObserver.disconnect();
      root.removeEventListener(HOME_REVEAL_COMPLETE, onReveal);
      root.removeEventListener('pointerover', onHover);
      document.removeEventListener('click', onControl, true);
      document.removeEventListener('focusin', onControl);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', stop);
      preference.removeEventListener('change', onPreference);
    };
  }, [
    rootRef,
    feedbackRef,
    timingRef,
    playFeedback,
    stopFeedback,
    playTiming,
    stopTiming,
  ]);
}
