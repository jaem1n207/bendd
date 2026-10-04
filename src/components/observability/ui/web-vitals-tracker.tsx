'use client';

import { useEffect } from 'react';
import {
  CONSENT_EVENT,
  getMeasurementId,
  loadAnalytics,
} from '@/components/observability/lib/analytics';
import { startWebVitals } from '@/components/observability/lib/web-vitals';

export function WebVitalsTracker() {
  useEffect(() => {
    if (!getMeasurementId()) {
      return;
    }
    const sync = () => loadAnalytics();
    sync();
    startWebVitals();
    window.addEventListener(CONSENT_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CONSENT_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return null;
}
