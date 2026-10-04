import type { Metric } from 'web-vitals';
import { expect, test, vi } from 'vitest';
const hooks = vi.hoisted(() => ({
  onCLS: vi.fn(),
  onFCP: vi.fn(),
  onINP: vi.fn(),
  onLCP: vi.fn(),
  onTTFB: vi.fn(),
}));
vi.mock('web-vitals', () => hooks);
import {
  AnalyticsConsent,
  CONSENT_KEY,
} from '@/components/observability/lib/analytics';
import { startWebVitals } from '@/components/observability/lib/web-vitals';

test('Web Vitals는 동의한 측정만 전송하고 같은 ID·값을 중복 전송하지 않는다', () => {
  vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-TEST123');
  const gtag = vi.fn();
  window.gtag = gtag;
  localStorage.clear();
  startWebVitals();
  startWebVitals();
  expect(hooks.onLCP).toHaveBeenCalledTimes(1);
  const report = hooks.onLCP.mock.calls[0][0];
  const metric = {
    name: 'LCP',
    id: 'vital-1',
    value: 1400,
    delta: 1400,
    rating: 'good',
    entries: [],
    navigationType: 'navigate',
    navigationId: 0,
  } satisfies Metric;
  report(metric);
  expect(gtag).not.toHaveBeenCalled();
  localStorage.setItem(CONSENT_KEY, AnalyticsConsent.Granted);
  report({ ...metric, id: 'vital-2' });
  report({ ...metric, id: 'vital-2' });
  expect(gtag).toHaveBeenCalledTimes(1);
  expect(gtag).toHaveBeenCalledWith(
    'event',
    'web_vital',
    expect.objectContaining({
      metric_name: 'LCP',
      metric_value: 1400,
      metric_id: 'vital-2',
      navigation_path: '/',
    })
  );
  localStorage.setItem(CONSENT_KEY, AnalyticsConsent.Denied);
  report({ ...metric, id: 'vital-3' });
  expect(gtag).toHaveBeenCalledTimes(1);
  vi.unstubAllEnvs();
});
