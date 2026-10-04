'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import {
  AnalyticsConsent,
  CONSENT_EVENT,
  DEMO_EVENT,
  loadAnalytics,
  readConsent,
  scheduleEvent,
} from '@/components/observability/lib/analytics';
import {
  contentProgress,
  isEngagedRead,
  relatedPath,
} from '@/components/observability/lib/engagement';

const CHECK_INTERVAL_MS = 1000;

export function EngagementTracker() {
  const pathname = usePathname();
  const visit = useRef({ pathname, sent: new Set<string>() });

  useEffect(() => {
    const content = document.querySelector('[data-engagement-content]');
    if (!(content instanceof HTMLElement)) {
      return;
    }

    if (visit.current.pathname !== pathname) {
      visit.current = { pathname, sent: new Set<string>() };
    }
    const { sent } = visit.current;
    const page = `${location.origin}${pathname}`;
    let activeMs = 0;
    let previousTime = performance.now();
    let previousActive = false;
    let maxProgress = 0;
    let frame = 0;

    const eligible = () =>
      document.visibilityState === 'visible' &&
      document.hasFocus() &&
      readConsent() === AnalyticsConsent.Granted;
    const sendOnce = (
      name:
        | 'page_view'
        | 'engaged_read'
        | 'related_article_click'
        | 'demo_complete',
      params: Record<string, string | number> = {},
      key: string = name
    ) => {
      if (sent.has(key) || readConsent() !== AnalyticsConsent.Granted) {
        return;
      }
      sent.add(key);
      scheduleEvent(name, {
        page_location: page,
        content_path: pathname,
        ...params,
      });
    };

    const sampleProgress = () => {
      frame = 0;
      if (!eligible()) {
        return;
      }
      maxProgress = Math.max(
        maxProgress,
        contentProgress(content.getBoundingClientRect(), window.innerHeight)
      );
      if (isEngagedRead(activeMs, maxProgress)) {
        sendOnce('engaged_read', {
          active_read_ms: Math.round(activeMs),
          read_progress: 75,
        });
      }
    };
    const onScroll = () => {
      if (frame || !eligible()) {
        return;
      }
      frame = requestAnimationFrame(sampleProgress);
    };
    const tick = () => {
      const now = performance.now();
      if (previousActive) {
        activeMs += now - previousTime;
      }
      previousTime = now;
      previousActive = eligible();
      sampleProgress();
    };
    const syncConsent = () => {
      tick();
      if (!loadAnalytics()) {
        return;
      }
      window.gtag?.('set', { page_location: page, page_referrer: '' });
      sendOnce('page_view', { page_referrer: '' });
    };
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      const link = event.target.closest('a[href]');
      if (!(link instanceof HTMLAnchorElement)) {
        return;
      }
      const target = relatedPath(link.href, pathname);
      if (target) {
        sendOnce('related_article_click', { target_path: target });
      }
    };
    const onDemo = (event: Event) => {
      if (
        !(event instanceof CustomEvent) ||
        typeof event.detail !== 'string' ||
        !/^[a-z0-9-]{1,40}$/.test(event.detail)
      ) {
        return;
      }
      sendOnce(
        'demo_complete',
        { demo_id: event.detail },
        `demo_complete:${event.detail}`
      );
    };

    syncConsent();
    const timer = window.setInterval(tick, CHECK_INTERVAL_MS);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('focus', tick);
    window.addEventListener('blur', tick);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener(CONSENT_EVENT, syncConsent);
    window.addEventListener('storage', syncConsent);
    window.addEventListener(DEMO_EVENT, onDemo);
    content.closest('main')?.addEventListener('click', onClick);

    return () => {
      window.clearInterval(timer);
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('focus', tick);
      window.removeEventListener('blur', tick);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener(CONSENT_EVENT, syncConsent);
      window.removeEventListener('storage', syncConsent);
      window.removeEventListener(DEMO_EVENT, onDemo);
      content.closest('main')?.removeEventListener('click', onClick);
    };
  }, [pathname]);

  return null;
}
