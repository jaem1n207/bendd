import type { ErrorEvent } from '@sentry/nextjs';

import { redactErrorText, stripUrlDetails } from '@/lib/monitoring/privacy';

export function scrubErrorEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;
  delete event.extra;
  delete event.breadcrumbs;

  if (event.request) {
    event.request = {
      method: event.request.method,
      url: event.request.url ? stripUrlDetails(event.request.url) : undefined,
    };
  }

  if (event.message) {
    event.message = redactErrorText(event.message);
  }

  for (const exception of event.exception?.values ?? []) {
    if (exception.value) {
      exception.value = redactErrorText(exception.value);
    }

    for (const frame of exception.stacktrace?.frames ?? []) {
      delete frame.vars;
      if (frame.filename) {
        frame.filename = stripUrlDetails(frame.filename);
      }
      if (frame.abs_path) {
        frame.abs_path = stripUrlDetails(frame.abs_path);
      }
    }
  }

  return event;
}

export function getSentryOptions() {
  const release = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;

  return {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    ...(release ? { release } : {}),
    sendDefaultPii: false,
    maxBreadcrumbs: 0,
    sampleRate: 1,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    enableLogs: false,
    beforeSend: scrubErrorEvent,
  };
}
