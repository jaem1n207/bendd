import * as Sentry from '@sentry/nextjs';

import { getSentryOptions } from '@/lib/monitoring/sentry-options';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init(getSentryOptions());
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
