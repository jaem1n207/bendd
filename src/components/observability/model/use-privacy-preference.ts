import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import {
  CONFIRMATION_MS,
  PRIVACY_SESSION_KEY,
  PrivacyView,
  READING_PROMPT_MS,
} from '@/components/observability/consts/privacy';
import {
  AnalyticsConsent,
  CONSENT_EVENT,
  CONSENT_KEY,
  readConsent,
  setConsent,
} from '@/components/observability/lib/analytics';
import { startVisibleTimer } from '@/components/observability/lib/visible-timer';

function promptWasSeen() {
  try {
    return sessionStorage.getItem(PRIVACY_SESSION_KEY) === 'seen';
  } catch {
    return true;
  }
}
function markPromptSeen() {
  try {
    sessionStorage.setItem(PRIVACY_SESSION_KEY, 'seen');
  } catch {
    // 저장이 막혀도 직접 설정을 열 수 있어요.
  }
}
function bodyIsVisible() {
  const content = document.querySelector('[data-engagement-content]');
  if (!content) {
    return false;
  }
  const rect = content.getBoundingClientRect();
  return rect.top < window.innerHeight && rect.bottom > 0;
}
function shortBodyIsVisible() {
  const content = document.querySelector('[data-engagement-content]');
  if (!content) {
    return false;
  }
  const rect = content.getBoundingClientRect();
  return rect.height <= window.innerHeight && bodyIsVisible();
}

export function usePrivacyPreference() {
  const pathname = usePathname();
  const [consent, updateConsent] = useState(AnalyticsConsent.Unknown);
  const [view, setView] = useState(PrivacyView.Closed);
  const [returnView, setReturnView] = useState(PrivacyView.Closed);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    updateConsent(readConsent());
    setReady(true);
    const sync = () => {
      updateConsent(readConsent());
      setView(current =>
        current === PrivacyView.Details ? current : PrivacyView.Closed
      );
      setError('');
    };
    const storage = (event: StorageEvent) => {
      if (event.key !== CONSENT_KEY && event.key !== null) {
        return;
      }
      sync();
      setView(current =>
        current === PrivacyView.Details ? current : PrivacyView.Closed
      );
    };
    window.addEventListener(CONSENT_EVENT, sync);
    window.addEventListener('storage', storage);
    return () => {
      window.removeEventListener(CONSENT_EVENT, sync);
      window.removeEventListener('storage', storage);
    };
  }, []);

  useEffect(() => {
    setView(PrivacyView.Closed);
    setError('');
  }, [pathname]);

  useEffect(() => {
    if (
      !ready ||
      consent !== AnalyticsConsent.Unknown ||
      view !== PrivacyView.Closed ||
      promptWasSeen()
    ) {
      return;
    }
    const show = () => {
      if (
        document.visibilityState !== 'visible' ||
        !document.hasFocus() ||
        !bodyIsVisible() ||
        promptWasSeen()
      ) {
        return;
      }
      markPromptSeen();
      setView(PrivacyView.Notice);
    };
    const timer = startVisibleTimer(
      READING_PROMPT_MS,
      show,
      shortBodyIsVisible
    );
    const scroll = () => {
      show();
      timer.sync();
    };
    const resize = () => timer.sync();
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', resize);
    return () => {
      timer.dispose();
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', resize);
    };
  }, [ready, consent, view, pathname]);

  const dismiss = useCallback(() => {
    markPromptSeen();
    setError('');
    setView(PrivacyView.Closed);
  }, []);

  useEffect(() => {
    if (view !== PrivacyView.Confirmation) {
      return;
    }
    const timer = startVisibleTimer(CONFIRMATION_MS, dismiss);
    return timer.dispose;
  }, [view, consent, dismiss]);

  const open = () => {
    markPromptSeen();
    setError('');
    setReturnView(
      view === PrivacyView.Notice ? PrivacyView.Notice : PrivacyView.Closed
    );
    setView(PrivacyView.Details);
  };
  const closeDetails = useCallback(() => {
    setError('');
    setView(returnView);
  }, [returnView]);
  const choose = (choice: AnalyticsConsent) => {
    if (!setConsent(choice)) {
      setError(
        '이 브라우저에 선택을 저장하지 못했어요. 브라우저 저장 설정을 확인한 뒤 다시 시도해 주세요.'
      );
      return;
    }
    markPromptSeen();
    setError('');
    setView(PrivacyView.Confirmation);
  };

  return { consent, view, ready, error, open, dismiss, closeDetails, choose };
}
