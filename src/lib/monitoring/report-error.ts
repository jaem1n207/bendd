import * as Sentry from '@sentry/nextjs';

const reportedErrors = new WeakSet<Error>();

export function reportBoundaryError(
  error: Error & { digest?: string },
  boundary: 'root' | 'global' | 'article'
) {
  if (reportedErrors.has(error)) {
    return;
  }

  reportedErrors.add(error);
  Sentry.captureException(error, {
    tags: { boundary, digest: error.digest ?? 'unknown' },
  });
}
