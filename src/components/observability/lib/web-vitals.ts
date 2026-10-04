import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

import {
  EventDelivery,
  scheduleEvent,
} from '@/components/observability/lib/analytics';

let registered = false;

export function startWebVitals() {
  if (registered) {
    return;
  }
  registered = true;
  const navigationPath = location.pathname;
  const values = new Map<string, number>();
  const report = (metric: Metric) => {
    if (values.get(metric.id) === metric.value) {
      return;
    }
    values.set(metric.id, metric.value);
    scheduleEvent(
      'web_vital',
      {
        metric_name: metric.name,
        metric_id: metric.id,
        metric_value: metric.value,
        metric_delta: metric.delta,
        metric_rating: metric.rating,
        navigation_type: metric.navigationType,
        navigation_path: navigationPath,
        page_location: `${location.origin}${navigationPath}`,
        page_referrer: '',
        transport_type: 'beacon',
      },
      EventDelivery.Immediate
    );
  };

  onCLS(report);
  onFCP(report);
  onINP(report);
  onLCP(report);
  onTTFB(report);
}
