'use client';

import { reportBoundaryError } from '@/lib/monitoring/report-error';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportBoundaryError(error, 'article');
  }, [error]);

  return (
    <main className="flex h-dvh flex-col items-center justify-center space-y-4 py-6 text-center">
      <Typography variant="h2" asChild className="mb-4">
        <h2>현재 서비스 개선 중이에요.</h2>
      </Typography>
      <Typography variant="p" affects="large" asChild>
        <p>{error.message}</p>
      </Typography>
      <Button onClick={() => reset()}>다시 시도</Button>
    </main>
  );
}
