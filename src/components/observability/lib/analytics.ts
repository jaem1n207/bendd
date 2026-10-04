import { stripUrlDetails } from '@/lib/monitoring/privacy';

export const CONSENT_KEY = 'bendd-analytics-consent-v1';
export const CONSENT_EVENT = 'bendd:analytics-consent';
export const DEMO_EVENT = 'bendd:demo-complete';

export enum AnalyticsConsent {
  Unknown = 'unknown',
  Granted = 'granted',
  Denied = 'denied',
}

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

export function getMeasurementId() {
  const value = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '';
  return /^G-[A-Z0-9]+$/.test(value) ? value : null;
}

export function readConsent(): AnalyticsConsent {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === AnalyticsConsent.Granted ||
      value === AnalyticsConsent.Denied
      ? value
      : AnalyticsConsent.Unknown;
  } catch {
    return AnalyticsConsent.Unknown;
  }
}

let activeConsent = AnalyticsConsent.Unknown;

function syncTagConsent(consent: AnalyticsConsent) {
  const id = getMeasurementId();
  if (!id) {
    return;
  }
  Reflect.set(window, `ga-disable-${id}`, consent !== AnalyticsConsent.Granted);
  if (window.gtag && activeConsent !== consent) {
    window.gtag('consent', 'update', {
      analytics_storage:
        consent === AnalyticsConsent.Granted ? 'granted' : 'denied',
    });
  }
  activeConsent = consent;
}

export function setConsent(consent: AnalyticsConsent) {
  try {
    localStorage.setItem(CONSENT_KEY, consent);
  } catch {
    return;
  }

  syncTagConsent(consent);

  if (consent !== AnalyticsConsent.Granted && window.gtag) {
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.trim().split('=')[0];
      if (!name.startsWith('_ga')) {
        continue;
      }
      const deletion = `${name}=; Max-Age=0; Path=/`;
      document.cookie = deletion;
      document.cookie = `${deletion}; Domain=${location.hostname}`;
      document.cookie = `${deletion}; Domain=.${location.hostname}`;
    }
  }

  window.dispatchEvent(new Event(CONSENT_EVENT));
}

let loadedId: string | null = null;
export function loadAnalytics() {
  const id = getMeasurementId();
  const consent = readConsent();
  syncTagConsent(consent);
  if (!id || consent !== AnalyticsConsent.Granted) {
    return false;
  }

  Reflect.set(window, `ga-disable-${id}`, false);
  if (loadedId === id) {
    return true;
  }

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function () {
    window.dataLayer?.push(arguments);
  };
  window.gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  window.gtag('js', new Date());
  window.gtag('config', id, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: stripUrlDetails(location.href),
    page_referrer: document.referrer ? stripUrlDetails(document.referrer) : '',
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  script.dataset.benddAnalytics = '';
  document.head.appendChild(script);
  loadedId = id;
  return true;
}

export enum EventDelivery {
  Idle = 'idle',
  Immediate = 'immediate',
}

export function scheduleEvent(
  name:
    | 'page_view'
    | 'engaged_read'
    | 'related_article_click'
    | 'demo_complete'
    | 'web_vital',
  params: Record<string, string | number>,
  delivery: EventDelivery = EventDelivery.Idle
) {
  let delivered = false;
  let cancelScheduled = () => {};
  const send = () => {
    if (delivered) {
      return;
    }
    delivered = true;
    cancelScheduled();
    window.removeEventListener('pagehide', send);
    if (readConsent() !== AnalyticsConsent.Granted || !getMeasurementId()) {
      return;
    }
    window.gtag?.('event', name, params);
  };

  if (delivery === EventDelivery.Immediate) {
    send();
    return;
  }

  window.addEventListener('pagehide', send, { once: true });
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(send, { timeout: 1000 });
    cancelScheduled = () => window.cancelIdleCallback(id);
    return;
  }

  const id = window.setTimeout(send, 0);
  cancelScheduled = () => window.clearTimeout(id);
}

export function reportDemoComplete(demoId: string) {
  window.dispatchEvent(new CustomEvent(DEMO_EVENT, { detail: demoId }));
}
