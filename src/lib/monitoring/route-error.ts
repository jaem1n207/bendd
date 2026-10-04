import * as Sentry from '@sentry/nextjs';
import type { NextRequest } from 'next/server';

import { redactErrorText } from '@/lib/monitoring/privacy';

export const INTERNAL_SERVER_ERROR = 500;

export function reportRouteError(
  error: unknown,
  request: NextRequest,
  startedAt: number
) {
  const vercelId = request.headers.get('x-vercel-id');
  const requestId =
    vercelId && /^[A-Za-z0-9:._-]{1,128}$/.test(vercelId)
      ? vercelId
      : crypto.randomUUID();
  const errorCode = error instanceof Error ? error.name : 'UnknownError';

  console.error(
    JSON.stringify({
      event: 'route_error',
      route: '/api/og',
      status: INTERNAL_SERVER_ERROR,
      time_to_response_ms: Math.round(performance.now() - startedAt),
      request_id: requestId,
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      error_code: errorCode,
      message:
        error instanceof Error
          ? redactErrorText(error.message)
          : 'Unknown error',
    })
  );

  Sentry.captureException(error, {
    tags: { route: '/api/og', error_code: errorCode, request_id: requestId },
  });
}
