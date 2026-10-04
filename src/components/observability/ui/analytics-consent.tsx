'use client';

import { useEffect, useState } from 'react';

import {
  AnalyticsConsent,
  CONSENT_EVENT,
  getMeasurementId,
  readConsent,
  setConsent,
} from '@/components/observability/lib/analytics';
import { Button } from '@/components/ui/button';

export function AnalyticsConsentControl() {
  const [consent, updateConsent] = useState(AnalyticsConsent.Unknown);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => updateConsent(readConsent());
    sync();
    setReady(true);
    window.addEventListener(CONSENT_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CONSENT_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  if (!ready || !getMeasurementId()) {
    return null;
  }

  return (
    <aside
      aria-label="이용 분석 설정"
      className="mb-8 space-y-3 border-t border-border pt-4 text-sm text-muted-foreground"
    >
      <p>
        글 읽기와 탐색 정보를 Google Analytics로 분석해 사이트를 개선합니다.
        허용하면 분석용 쿠키를 사용하며, 입력 내용은 수집하지 않습니다.
      </p>
      <p role="status">
        {consent === AnalyticsConsent.Granted
          ? '이용 분석을 허용했습니다.'
          : consent === AnalyticsConsent.Denied
            ? '이용 분석을 거절했습니다.'
            : '허용하기 전에는 Google Analytics를 로드하지 않습니다.'}
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={consent === AnalyticsConsent.Granted}
          onClick={() => setConsent(AnalyticsConsent.Granted)}
        >
          허용
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={consent === AnalyticsConsent.Denied}
          onClick={() => setConsent(AnalyticsConsent.Denied)}
        >
          {consent === AnalyticsConsent.Granted ? '허용 철회' : '거절'}
        </Button>
      </div>
    </aside>
  );
}
