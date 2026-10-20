'use client';

import { ArrowUpRight, Check, ShieldCheck, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';

import {
  PrivacyView,
  PRIVACY_EASE,
  PRIVACY_ENTER_SECONDS,
  PRIVACY_EXIT_SECONDS,
  PRIVACY_FADE_SECONDS,
  PRIVACY_DESKTOP_OFFSET,
  PRIVACY_MOBILE_OFFSET,
  PRIVACY_MOBILE_MEDIA,
} from '@/components/observability/consts/privacy';
import { AnalyticsConsent } from '@/components/observability/lib/analytics';
import { containPrivacyDialog } from '@/components/observability/lib/privacy-dialog';
import { usePrivacyPreference } from '@/components/observability/model/use-privacy-preference';
import { PrivacySurface } from '@/components/observability/ui/privacy-surface';
import { PrivacyDetails } from '@/components/observability/ui/privacy-details';
import { PrivacyFooter } from '@/components/observability/ui/privacy-footer';
import styles from '@/components/observability/ui/privacy-settings.module.css';
import { Button } from '@/components/ui/button';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

const exitVariants = {
  exit: ({ offset, duration }: { offset: number; duration: number }) => ({
    opacity: 0,
    transform: `translateY(${offset}px)`,
    transition: { duration, ease: PRIVACY_EASE },
  }),
};
const fadeVariants = {
  exit: (duration: number) => ({
    opacity: 0,
    transition: { duration, ease: PRIVACY_EASE },
  }),
};

export function AnalyticsConsentControl() {
  const {
    consent,
    view,
    ready,
    error,
    saved,
    open,
    dismiss,
    closeDetails,
    choose,
  } = usePrivacyPreference();
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const [keyboardInput, setKeyboardInput] = useState(false);
  const [explanationStart, setExplanationStart] = useState(false);
  const [offset, setOffset] = useState(PRIVACY_DESKTOP_OFFSET);
  const panel = useRef<HTMLElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const detailTrigger = useRef<HTMLButtonElement>(null);
  const previousView = useRef(view);
  const reduced = usePrefersReducedMotion();
  const titleId = useId();
  const descriptionId = useId();
  const expanded = view === PrivacyView.Details;
  const confirmed = view === PrivacyView.Confirmation;
  const move = reduced === false && !keyboardInput;
  const fadeDuration = keyboardInput ? 0 : PRIVACY_FADE_SECONDS;
  const duration = move
    ? expanded
      ? PRIVACY_ENTER_SECONDS
      : PRIVACY_EXIT_SECONDS
    : fadeDuration;
  const exitMotion = {
    offset: move ? offset : 0,
    duration: move ? PRIVACY_EXIT_SECONDS : fadeDuration,
  };
  const closeOnEscape = useCallback(() => {
    setKeyboardInput(true);
    closeDetails();
  }, [closeDetails]);

  useEffect(() => setPortal(document.body), []);
  useLayoutEffect(() => {
    if (!expanded || !panel.current) {
      return;
    }
    return containPrivacyDialog(panel.current, closeOnEscape);
  }, [expanded, closeOnEscape]);
  useLayoutEffect(() => {
    const footerTarget = opener.current?.isConnected
      ? opener.current
      : launcher.current;
    if (previousView.current === PrivacyView.Details && !expanded) {
      const target =
        view === PrivacyView.Closed ? footerTarget : detailTrigger.current;
      target?.focus({ preventScroll: true });
    }
    if (
      previousView.current !== PrivacyView.Closed &&
      view === PrivacyView.Closed &&
      panel.current?.contains(document.activeElement)
    ) {
      footerTarget?.focus({ preventScroll: true });
    }
    previousView.current = view;
  }, [view, expanded]);

  const openSettings = (event: MouseEvent<HTMLElement>) => {
    opener.current = event.currentTarget;
    setExplanationStart(event.currentTarget.hasAttribute('data-privacy-info'));
    setKeyboardInput(event.detail === 0);
    setOffset(
      window.matchMedia?.(PRIVACY_MOBILE_MEDIA).matches
        ? PRIVACY_MOBILE_OFFSET
        : PRIVACY_DESKTOP_OFFSET
    );
    open();
  };
  const closeSettings = (event: MouseEvent<HTMLElement>) => {
    setKeyboardInput(event.detail === 0);
    closeDetails();
  };
  const feedback =
    consent === AnalyticsConsent.Granted
      ? '이용 분석을 허용했어요.'
      : '분석 쿠키를 사용하지 않아요.';
  const currentChoice =
    consent === AnalyticsConsent.Unknown
      ? '아직 선택하지 않았어요'
      : consent === AnalyticsConsent.Granted
        ? '분석 쿠키 허용'
        : '분석 쿠키 거부';

  return (
    <>
      <PrivacyFooter
        launcherRef={launcher}
        ready={ready}
        expanded={expanded}
        onOpen={openSettings}
      />
      {ready &&
        portal &&
        createPortal(
          <div className={styles.root} data-privacy-root="">
            <AnimatePresence custom={fadeDuration}>
              {expanded && (
                <motion.div
                  key="backdrop"
                  className={styles.backdrop}
                  data-privacy-backdrop=""
                  aria-hidden="true"
                  initial={keyboardInput ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  variants={fadeVariants}
                  exit="exit"
                  custom={fadeDuration}
                  transition={{ duration: fadeDuration, ease: PRIVACY_EASE }}
                  onClick={closeSettings}
                />
              )}
            </AnimatePresence>
            <div className={styles.positioner}>
              <AnimatePresence custom={exitMotion}>
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
                    layout={move && !expanded}
                    style={{ borderRadius: 24 }}
                    initial={
                      keyboardInput
                        ? false
                        : {
                            opacity: 0,
                            transform: `translateY(${move ? offset : 0}px)`,
                          }
                    }
                    animate={{ opacity: 1, transform: 'translateY(0px)' }}
                    variants={exitVariants}
                    exit="exit"
                    custom={exitMotion}
                    transition={{ duration, ease: PRIVACY_EASE }}
                  >
                    <motion.div
                      className={styles.inner}
                      layout={move && !expanded ? 'position' : false}
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
                          onClick={expanded ? closeSettings : dismiss}
                        >
                          <X size={16} aria-hidden="true" />
                        </Button>
                      </div>
                      {expanded && (
                        <p className={styles.currentChoice}>
                          현재 선택 <strong>{currentChoice}</strong>
                        </p>
                      )}
                      <AnimatePresence initial={false} mode="popLayout">
                        <motion.div
                          key={
                            confirmed
                              ? 'confirmation'
                              : expanded
                                ? 'details'
                                : 'notice'
                          }
                          layout={move && !expanded ? 'position' : false}
                          className={
                            expanded ? styles.descriptionBody : styles.body
                          }
                          data-privacy-scroll={expanded ? '' : undefined}
                          tabIndex={expanded ? 0 : undefined}
                          aria-label={expanded ? '개인정보 설명' : undefined}
                          initial={keyboardInput ? false : { opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: fadeDuration,
                            ease: PRIVACY_EASE,
                          }}
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
                              <p
                                id={descriptionId}
                                className={styles.description}
                              >
                                페이지 하단의 쿠키 설정에서 언제든 바꿀 수
                                있어요.
                              </p>
                            </>
                          ) : expanded ? (
                            <>
                              <p
                                id={descriptionId}
                                className={styles.description}
                              >
                                허용하지 않아도 글과 Craft는 그대로 이용할 수
                                있어요.
                              </p>
                            </>
                          ) : (
                            <p
                              id={descriptionId}
                              className={styles.description}
                            >
                              글 읽기와 탐색·성능 정보를 살펴 사이트를 개선해요.
                              허용하면 Google Analytics 분석 쿠키를 사용해요.
                            </p>
                          )}
                        </motion.div>
                      </AnimatePresence>
                      {!expanded && error && (
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
                            {expanded &&
                              consent === AnalyticsConsent.Granted && (
                                <span className={styles.selectedLabel}>
                                  <Check size={12} aria-hidden="true" />
                                  현재 선택
                                </span>
                              )}
                          </Button>
                          <Button
                            variant="outline"
                            aria-pressed={
                              expanded
                                ? consent === AnalyticsConsent.Denied
                                : undefined
                            }
                            onClick={() => choose(AnalyticsConsent.Denied)}
                          >
                            <span>거부하기</span>
                            {expanded &&
                              consent === AnalyticsConsent.Denied && (
                                <span className={styles.selectedLabel}>
                                  <Check size={12} aria-hidden="true" />
                                  현재 선택
                                </span>
                              )}
                          </Button>
                        </div>
                      )}
                      {expanded && (
                        <div
                          className={styles.feedbackSlot}
                          role="status"
                          aria-live="polite"
                          aria-atomic="true"
                        >
                          {error ? (
                            <p>{error}</p>
                          ) : saved ? (
                            <motion.p
                              key={consent}
                              initial={keyboardInput ? false : { opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{
                                duration: fadeDuration,
                                ease: PRIVACY_EASE,
                              }}
                            >
                              {feedback}
                            </motion.p>
                          ) : null}
                        </div>
                      )}
                      {expanded && (
                        <div
                          className={styles.details}
                          data-privacy-scroll=""
                          tabIndex={0}
                          aria-label="개인정보 설명"
                        >
                          <PrivacyDetails
                            initiallyExpanded={explanationStart}
                          />
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
                            onClick={openSettings}
                          >
                            쿠키 설정
                            <ArrowUpRight
                              size={13}
                              className="ml-1"
                              aria-hidden="true"
                            />
                          </Button>
                          {!confirmed && (
                            <span>선택은 언제든 바꿀 수 있어요</span>
                          )}
                        </div>
                      )}
                    </motion.div>
                  </PrivacySurface>
                )}
              </AnimatePresence>
            </div>
          </div>,
          portal
        )}
    </>
  );
}
