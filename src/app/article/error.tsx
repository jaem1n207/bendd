'use client';

import { track } from '@vercel/analytics';
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
    track('article page error', {
      error: error.message,
    });
  }, [error]);

  return (
    <main className="bd-flex bd-h-dvh bd-flex-col bd-items-center bd-justify-center bd-space-y-4 bd-py-6 bd-text-center">
      <Typography variant="h2" asChild className="bd-mb-4">
        <h2>현재 서비스 개선 중이에요.</h2>
      </Typography>
      <Typography variant="p" affects="large" asChild>
        <p>{error.message}</p>
      </Typography>
      <Button onClick={() => reset()}>다시 시도</Button>
    </main>
  );
}
