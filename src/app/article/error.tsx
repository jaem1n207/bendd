'use client';

import { Button } from '@/components/ui/button';
import { Title } from '@/components/ui/typography';
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
    <section className="bd-space-y-4 bd-py-6 bd-text-center">
      <Title size="h2">현재 서비스 개선 중이에요.</Title>
      <Button onClick={() => reset()}>다시 시도</Button>
    </section>
  );
}
