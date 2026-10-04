'use client';

import {
  ArrowUpRight,
  Check,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  PrivacyView,
  PRIVACY_EASE,
  PRIVACY_ENTER_SECONDS,
  PRIVACY_EXIT_SECONDS,
  PRIVACY_FADE_SECONDS,
} from '@/components/observability/consts/privacy';
import {
  AnalyticsConsent,
  getMeasurementId,
} from '@/components/observability/lib/analytics';
import { containPrivacyDialog } from '@/components/observability/lib/privacy-dialog';
import { usePrivacyPreference } from '@/components/observability/model/use-privacy-preference';
import { PrivacySurface } from '@/components/observability/ui/privacy-surface';
import { PrivacyDetails } from '@/components/observability/ui/privacy-details';
import styles from '@/components/observability/ui/privacy-settings.module.css';
import { Button } from '@/components/ui/button';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

export function AnalyticsConsentControl() {
  const preference = usePrivacyPreference();
  const { consent, view, ready, error, open, dismiss, closeDetails, choose } =
    preference;
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const panel = useRef<HTMLElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const detailTrigger = useRef<HTMLButtonElement>(null);
  const previousView = useRef(view);
  const reduced = usePrefersReducedMotion();
  const titleId = useId();
  const descriptionId = useId();
  const expanded = view === PrivacyView.Details;
  const confirmed = view === PrivacyView.Confirmation;
  const duration = reduced
    ? PRIVACY_FADE_SECONDS
    : expanded
      ? PRIVACY_ENTER_SECONDS
      : PRIVACY_EXIT_SECONDS;

  useEffect(() => setPortal(document.body), []);
  useLayoutEffect(() => {
    if (!expanded || !panel.current) {
      return;
    }
    return containPrivacyDialog(panel.current, closeDetails);
  }, [expanded, closeDetails]);
  useLayoutEffect(() => {
    if (
      previousView.current === PrivacyView.Details &&
      view !== PrivacyView.Details
    ) {
      const target =
        view === PrivacyView.Closed ? launcher.current : detailTrigger.current;
      target?.focus({ preventScroll: true });
    }
    if (
      previousView.current !== PrivacyView.Closed &&
      view === PrivacyView.Closed &&
      panel.current?.contains(document.activeElement)
    ) {
      launcher.current?.focus({ preventScroll: true });
    }
    previousView.current = view;
  }, [view]);

  if (!ready || !portal || !getMeasurementId()) {
    return null;
  }

  const feedback =
    consent === AnalyticsConsent.Granted
      ? '이용 분석을 허용했어요.'
      : '분석 쿠키를 사용하지 않아요.';

  return createPortal(
    <div className={styles.root} data-privacy-root="">
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="backdrop"
            className={styles.backdrop}
            data-privacy-backdrop=""
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: reduced ? PRIVACY_FADE_SECONDS : PRIVACY_EXIT_SECONDS,
            }}
            onClick={closeDetails}
          />
        )}
      </AnimatePresence>
      <Button
        ref={launcher}
        className={styles.launcher}
        variant="outline"
        size="sm"
        onClick={open}
        style={{
          visibility: view === PrivacyView.Closed ? 'visible' : 'hidden',
        }}
        aria-haspopup="dialog"
        aria-expanded={expanded}
        tabIndex={view === PrivacyView.Closed ? 0 : -1}
      >
        <SlidersHorizontal size={14} aria-hidden="true" />
        쿠키 설정
      </Button>
      <AnimatePresence>
        {view !== PrivacyView.Closed && (
          <PrivacySurface
            panelRef={panel}
            key="privacy-card"
            className={styles.card}
            data-view={view}
            role={expanded ? 'dialog' : undefined}
            aria-modal={expanded ? true : undefined}
            aria-label={expanded ? '쿠키 설정' : '이용 분석 설정'}
            aria-labelledby={expanded ? undefined : titleId}
            aria-describedby={descriptionId}
            layout={reduced ? false : true}
            style={{ borderRadius: 24 }}
            initial={{
              opacity: 0,
              y: reduced ? 0 : 8,
              scale: reduced ? 1 : 0.98,
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduced ? 0 : 8, scale: reduced ? 1 : 0.98 }}
            transition={{ duration, ease: PRIVACY_EASE }}
          >
            <motion.div
              className={styles.inner}
              layout={reduced ? false : 'position'}
            >
              <div className={styles.header}>
                <div>
                  <p className={styles.eyebrow}>
                    <ShieldCheck size={14} aria-hidden="true" />
                    개인정보 선택
                  </p>
                  <h2 id={titleId} className={styles.title}>
                    {expanded
                      ? '쿠키 설정'
                      : confirmed
                        ? '선택을 저장했어요'
                        : '이용 분석을 선택해 주세요'}
                  </h2>
                </div>
                <Button
                  className={styles.close}
                  variant="ghost"
                  size="icon"
                  aria-label={
                    expanded
                      ? '상세 설정 닫기'
                      : confirmed
                        ? '확인 닫기'
                        : '나중에 선택하기'
                  }
                  onClick={expanded ? closeDetails : dismiss}
                >
                  <X size={16} aria-hidden="true" />
                </Button>
              </div>
              <AnimatePresence initial={false} mode="popLayout">
                <motion.div
                  key={
                    confirmed ? 'confirmation' : expanded ? 'details' : 'notice'
                  }
                  layout={reduced ? false : 'position'}
                  className={expanded ? styles.details : styles.body}
                  data-privacy-scroll={expanded ? '' : undefined}
                  tabIndex={expanded ? 0 : undefined}
                  aria-label={expanded ? '개인정보 설명' : undefined}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: PRIVACY_FADE_SECONDS }}
                >
                  {confirmed ? (
                    <>
                      <p
                        role="status"
                        aria-live="polite"
                        aria-atomic="true"
                        className={styles.status}
                      >
                        <Check
                          size={16}
                          className="mb-0.5 mr-2 inline"
                          aria-hidden="true"
                        />
                        {feedback}
                      </p>
                      <p id={descriptionId} className={styles.description}>
                        쿠키 설정에서 언제든 바꿀 수 있어요.
                      </p>
                    </>
                  ) : expanded ? (
                    <>
                      <p id={descriptionId} className={styles.description}>
                        궁금한 내용을 펼쳐 보고 선택해 주세요.
                      </p>
                      <PrivacyDetails />
                    </>
                  ) : (
                    <p id={descriptionId} className={styles.description}>
                      글 읽기와 탐색·성능 정보를 살펴 사이트를 개선해요.
                      허용하면 Google Analytics 분석 쿠키를 사용해요.
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
              {error && (
                <p role="status" className={styles.status}>
                  {error}
                </p>
              )}
              {!confirmed && (
                <div className={styles.actions}>
                  <Button
                    variant="outline"
                    aria-pressed={
                      expanded
                        ? consent === AnalyticsConsent.Granted
                        : undefined
                    }
                    onClick={() => choose(AnalyticsConsent.Granted)}
                  >
                    <span>분석 쿠키 허용</span>
                    {expanded && consent === AnalyticsConsent.Granted && (
                      <span className={styles.selectedLabel}>
                        <Check size={12} aria-hidden="true" />
                        현재 선택
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    aria-pressed={
                      expanded ? consent === AnalyticsConsent.Denied : undefined
                    }
                    onClick={() => choose(AnalyticsConsent.Denied)}
                  >
                    <span>거부하기</span>
                    {expanded && consent === AnalyticsConsent.Denied && (
                      <span className={styles.selectedLabel}>
                        <Check size={12} aria-hidden="true" />
                        현재 선택
                      </span>
                    )}
                  </Button>
                </div>
              )}
              {!expanded && (
                <div className={styles.footer}>
                  <Button
                    ref={detailTrigger}
                    variant="ghost"
                    size="sm"
                    aria-haspopup="dialog"
                    aria-expanded="false"
                    onClick={open}
                  >
                    쿠키 설정
                    <ArrowUpRight
                      size={13}
                      className="ml-1"
                      aria-hidden="true"
                    />
                  </Button>
                  {!confirmed && <span>선택은 언제든 바꿀 수 있어요</span>}
                </div>
              )}
            </motion.div>
          </PrivacySurface>
        )}
      </AnimatePresence>
    </div>,
    portal
  );
}
