'use client';

import { track } from '@vercel/analytics';
import { useEffect } from 'react';
import Image from 'next/image';

import { Typography } from '@/components/ui/typography';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    track('global error', {
      error: error.message,
    });
  }, [error]);

  return (
    <html>
      <body>
        <section className="bd:flex bd:h-screen bd:flex-col bd:items-center bd:justify-center bd:space-y-4">
          <div className="bd:relative bd:size-96">
            <Image
              src="/rabbit.svg"
              alt="primary character"
              draggable={false}
              className="bd:dark:invert"
              fill
              priority
            />
          </div>
          <Typography variant="h2">예상하지 못한 문제가 발생했어요.</Typography>
          <Typography variant="p">
            일시적인 장애이거나 네트워크 문제일 수 있어요. 해당 문제는 확인 및
            대응 중이니 잠시 후 다시 시도해주세요.
          </Typography>
          <Typography variant="p" affects="muted">
            {error.message}
          </Typography>
        </section>
      </body>
    </html>
  );
}
