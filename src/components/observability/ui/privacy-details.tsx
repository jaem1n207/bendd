import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { useId, useState, type ReactNode } from 'react';

import {
  PRIVACY_EASE,
  PRIVACY_EXIT_SECONDS,
  PRIVACY_FADE_SECONDS,
} from '@/components/observability/consts/privacy';
import styles from '@/components/observability/ui/privacy-settings.module.css';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

function SectionContent({
  id,
  labelId,
  children,
}: {
  id: string;
  labelId: string;
  children: ReactNode;
}) {
  const present = useIsPresent();
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      id={id}
      role="region"
      aria-labelledby={labelId}
      aria-hidden={present ? undefined : true}
      inert={!present}
      className={styles.sectionReveal}
      initial={{ height: reduced ? 'auto' : 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: reduced ? 'auto' : 0, opacity: 0 }}
      transition={{
        duration: reduced ? PRIVACY_FADE_SECONDS : PRIVACY_EXIT_SECONDS,
        ease: PRIVACY_EASE,
      }}
    >
      <div className={styles.sectionContent}>{children}</div>
    </motion.div>
  );
}

function PrivacySection({
  number,
  title,
  hint,
  children,
}: {
  number: string;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const labelId = `${id}-label`;
  return (
    <li className={styles.section}>
      <h3>
        <button
          id={labelId}
          type="button"
          className={styles.sectionTrigger}
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded(value => !value)}
        >
          <span className={styles.sectionNumber} aria-hidden="true">
            {number}
          </span>
          <span className={styles.sectionHeading}>
            <span>{title}</span>
            <span className={styles.sectionHint}>{hint}</span>
          </span>
          <ChevronDown
            size={16}
            className={styles.chevron}
            aria-hidden="true"
          />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {expanded && (
          <SectionContent id={id} labelId={labelId}>
            {children}
          </SectionContent>
        )}
      </AnimatePresence>
    </li>
  );
}

export function PrivacyDetails() {
  return (
    <ol className={styles.sections}>
      <PrivacySection
        number="01"
        title="어떤 정보를 살펴보나요?"
        hint="읽기·탐색·성능, 기기와 유입 정보"
      >
        <p>
          글과 Craft를 더 편하게 읽고 사용할 수 있도록 Google Analytics 4로 이용
          흐름을 살펴봐요.
        </p>
        <ul className={styles.contentList}>
          <li>
            <strong>읽기</strong> — 읽은 글·Craft의 경로, 머문 시간, 읽기 진도
          </li>
          <li>
            <strong>탐색과 데모</strong> — 다음 글로 이동한 링크, 데모 완료 여부
          </li>
          <li>
            <strong>성능</strong> — 화면이 뜨는 속도와 사용자 입력에 반응하는
            속도
          </li>
          <li>
            <strong>방문 환경</strong> — 기기·브라우저·언어, 유입 경로, 대략적인
            지역
          </li>
        </ul>
        <p className={styles.note}>
          이름·이메일·입력 내용은 분석 이벤트에 담지 않아요. 주소의 검색 조건과
          # 뒤 내용도 제외해요. 광고 맞춤설정과 Google Signals는 사용하지
          않아요.
        </p>
      </PrivacySection>
      <PrivacySection
        number="02"
        title="쿠키는 얼마나 남나요?"
        hint="브라우저 쿠키 · 마지막 방문부터 2년"
      >
        <p>Google Analytics 4(Google)가 사용하는 분석 쿠키예요.</p>
        <dl className={styles.cookies}>
          <div>
            <dt>_ga</dt>
            <dd>방문자를 구분하는 임의의 번호를 저장해요.</dd>
          </div>
          <div>
            <dt>_ga_*</dt>
            <dd>방문 세션 정보를 유지해요.</dd>
          </div>
        </dl>
        <ul className={styles.contentList}>
          <li>
            이 브라우저에 마지막 방문부터 <strong>2년</strong> 동안 남아요.
          </li>
          <li>다시 방문하면 쿠키의 남은 기간이 갱신돼요.</li>
          <li>브라우저 설정에 따라 더 일찍 지워질 수 있어요.</li>
        </ul>
        <a
          className={styles.reference}
          href="https://support.google.com/analytics/answer/11397207?hl=ko"
          target="_blank"
          rel="noreferrer"
        >
          Google 분석 쿠키 안내 ↗
        </a>
      </PrivacySection>
      <PrivacySection
        number="03"
        title="데이터는 얼마나 보관하나요?"
        hint="Google Analytics 데이터 · 14개월"
      >
        <p>
          브라우저 쿠키와 별개로, Google Analytics에 전송한 데이터는 아래 기간
          동안 보관해요.
        </p>
        <dl className={styles.retention}>
          <div>
            <dt>이벤트 데이터</dt>
            <dd>14개월</dd>
          </div>
          <div>
            <dt>사용자 데이터</dt>
            <dd>마지막 활동부터 14개월</dd>
          </div>
        </dl>
        <ul className={styles.contentList}>
          <li>새 활동이 있으면 사용자 데이터 보관 기간이 갱신돼요.</li>
          <li>
            방문 수처럼 합산된 표준 보고서는 이 기간의 적용을 받지 않아요.
          </li>
        </ul>
        <a
          className={styles.reference}
          href="https://support.google.com/analytics/answer/7667196?hl=ko"
          target="_blank"
          rel="noreferrer"
        >
          Google 데이터 보관 안내 ↗
        </a>
      </PrivacySection>
      <PrivacySection
        number="04"
        title="선택은 어떻게 바꾸나요?"
        hint="언제든 변경 · 거부해도 글과 Craft 이용 가능"
      >
        <ul className={styles.contentList}>
          <li>
            <strong>허용하기 전</strong> — Google Analytics를 불러오지 않아요.
          </li>
          <li>
            <strong>거부하기</strong> — 이 브라우저의 분석 쿠키를 지우고 이후
            분석 전송을 멈춰요. 이미 전송한 정보가 즉시 삭제되는 것은 아니에요.
          </li>
          <li>
            <strong>선택 저장</strong> — 직접 바꾸거나 사이트 저장 정보를 지우기
            전까지 이 브라우저에 유지돼요.
          </li>
        </ul>
        <p>
          선택을 바꾸려면 화면의 ‘쿠키 설정’을 열고 아래 버튼을 눌러 주세요.
          허용하지 않아도 글과 Craft는 그대로 이용할 수 있어요.
        </p>
        <p className={styles.note}>
          이 설정은 Google Analytics에 적용돼요. 분석 쿠키를 쓰지 않는 Vercel
          방문·성능 통계와 Sentry 오류 점검은 계속 동작해요.
        </p>
      </PrivacySection>
    </ol>
  );
}
