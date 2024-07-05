'use client';

import { Button } from '@/components/ui/button';
import { Paragraph, Title } from '@/components/ui/typography';
import { track } from '@vercel/analytics';
import { useEffect } from 'react';

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
      <Title size="h2" className="bd-mb-4">
        현재 서비스 개선 중이에요.
      </Title>
      <Paragraph size="lg">{error.message}</Paragraph>
      <Button onClick={() => reset()}>다시 시도</Button>
    </main>
  );
}
