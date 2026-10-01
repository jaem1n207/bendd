'use client';

import { ArrowUpRight, BookOpen } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ProfilePlayback,
  useProfileIntro,
} from '@/components/profile/model/use-profile-intro';
import { useProfilePreview } from '@/components/profile/model/use-profile-preview';
import styles from '@/components/profile/ui/home-profile.module.css';
import { GitHub, Mail, Youtube } from '@/components/ui/icons';
import { siteMetadata } from '@/lib/site-metadata';
import { signaturePath } from '@/lib/signature-path';

enum InputOrigin {
  Pointer = 'pointer',
  Keyboard = 'keyboard',
}

const links = {
  github: {
    label: 'GitHub 프로필',
    title: 'GitHub',
    href: siteMetadata.github,
    icon: GitHub,
  },
  youtube: {
    label: 'YouTube 채널',
    title: 'YouTube',
    href: 'https://www.youtube.com/@ben_jaemin',
    icon: Youtube,
  },
  mail: {
    label: 'Gmail로 연락하기',
    title: 'Gmail',
    href: `mailto:${siteMetadata.email}`,
    icon: Mail,
  },
};

export function HomeProfile() {
  const preview = useProfilePreview();
  const [reacted, setReacted] = useState(false);
  const [status, setStatus] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rootRef = useRef<HTMLElement>(null);
  const feedbackRef = useRef<HTMLButtonElement>(null);
  const timingRef = useRef<HTMLButtonElement>(null);
  const traceRef = useRef<HTMLSpanElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const signatureRef = useRef<SVGPathElement>(null);
  const signoffRef = useRef<HTMLDivElement>(null);
  const timingMotion = useRef<Animation[]>([]);
  const signatureMotion = useRef<Animation | undefined>(undefined);

  const stopTiming = useCallback(() => {
    timingMotion.current.forEach(animation => animation.cancel());
    timingMotion.current = [];
  }, []);

  const playFeedback = useCallback((playback = ProfilePlayback.Manual) => {
    clearTimeout(timer.current);
    setReacted(true);
    if (playback === ProfilePlayback.Manual) {
      setStatus('클릭에 반응했습니다.');
    }
    // The automatic demonstration is 160ms in + 300ms hold + 160ms out.
    timer.current = setTimeout(
      () => setReacted(false),
      playback === ProfilePlayback.Automatic ? 460 : 620
    );
  }, []);
  const stopFeedback = useCallback(() => {
    clearTimeout(timer.current);
    setReacted(false);
  }, []);

  const playTiming = useCallback(
    (origin = InputOrigin.Pointer) => {
      stopTiming();
      const trace = traceRef.current;
      const dot = dotRef.current;
      const button = timingRef.current;
      if (
        origin === InputOrigin.Keyboard ||
        matchMedia('(prefers-reduced-motion: reduce)').matches ||
        !trace ||
        !dot ||
        !button ||
        typeof trace.animate !== 'function'
      ) {
        return;
      }
      const distance = button.getBoundingClientRect().width - 3;
      const options = { duration: 720, easing: 'cubic-bezier(.22,1,.36,1)' };
      timingMotion.current = [
        trace.animate(
          [
            { transform: 'scaleX(0)', opacity: 0.3, offset: 0 },
            { transform: 'scaleX(1)', opacity: 0.5, offset: 0.8 },
            { transform: 'scaleX(1)', opacity: 0, offset: 1 },
          ],
          options
        ),
        dot.animate(
          [
            { transform: 'translateX(0)', opacity: 0, offset: 0 },
            { transform: 'translateX(0)', opacity: 1, offset: 0.04 },
            { transform: `translateX(${distance}px)`, opacity: 1, offset: 0.9 },
            { transform: `translateX(${distance}px)`, opacity: 0, offset: 1 },
          ],
          options
        ),
      ];
    },
    [stopTiming]
  );

  useProfileIntro({
    rootRef,
    feedbackRef,
    timingRef,
    playFeedback,
    stopFeedback,
    playTiming,
    stopTiming,
  });

  const replaySignature = useCallback((origin: InputOrigin) => {
    signatureMotion.current?.cancel();
    const path = signatureRef.current;
    if (
      origin === InputOrigin.Keyboard ||
      matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !path ||
      typeof path.animate !== 'function'
    ) {
      return;
    }
    signatureMotion.current = path.animate(
      [{ strokeDashoffset: 28.1386 }, { strokeDashoffset: 0 }],
      { duration: 2300, easing: 'cubic-bezier(.65,0,.35,1)' }
    );
  }, []);

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const stop = () => {
      stopTiming();
      signatureMotion.current?.cancel();
      signatureMotion.current = undefined;
    };
    const onPreference = () => {
      if (preference.matches) {
        stop();
      }
    };
    const signoff = signoffRef.current;
    const observer =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(entries => {
            if (!entries.some(entry => entry.isIntersecting) || !signoff) {
              return;
            }
            observer?.disconnect();
            // Already visible means keyboard, return navigation, or the readable
            // slow-hydration fallback; none should restart a decorative drawing.
            if (signoff.dataset.revealState !== 'visible') {
              replaySignature(InputOrigin.Pointer);
            }
          })
        : undefined;
    if (signoff) {
      observer?.observe(signoff);
    }
    preference.addEventListener('change', onPreference);
    document.addEventListener('keydown', stop);
    return () => {
      clearTimeout(timer.current);
      stop();
      observer?.disconnect();
      preference.removeEventListener('change', onPreference);
      document.removeEventListener('keydown', stop);
    };
  }, [replaySignature, stopTiming]);

  const selected = links[preview.rendered];
  const Icon = selected.icon;

  return (
    <header
      ref={rootRef}
      className={styles.profile}
      data-reveal-group="profile"
    >
      <div className={styles.person} data-reveal>
        <div className={styles.photoTarget}>
          <figure className={styles.photo}>
            <Image
              src="/images/profile/jaemin.jpg"
              alt="이재민의 프로필 사진"
              width={474}
              height={512}
              sizes="152px"
              priority
            />
          </figure>
        </div>
        <div>
          <h1>{siteMetadata.author}</h1>
          <div className={styles.meta}>
            <span className={styles.nameEn}>JAEMIN LEE</span>
            <span className={styles.metaSeparator} aria-hidden="true" />
            <span className={styles.job}>Software Engineer</span>
          </div>
        </div>
      </div>
      <p className={styles.intro} data-reveal>
        인터페이스는 당신의 의도를 이해했다는 신호를 보냅니다.
      </p>
      <div className={styles.bio}>
        <p data-reveal>
          사용자의 의도에 <strong>자연스럽게 반응하는 인터페이스</strong>를
          만듭니다.{' '}
          <span className={styles.wordGroup}>
            <button
              ref={feedbackRef}
              type="button"
              className={`${styles.phrase} ${styles.feedback}`}
              aria-label="클릭에 대한 피드백, 눌러서 반응 체험하기"
              data-reacted={reacted || undefined}
              onClick={() => playFeedback()}
            >
              <span>클릭에 대한 피드백</span>
            </button>
            부터
          </span>{' '}
          화면 전환의 흐름까지, 복잡한 사용자 인터페이스도 쉽게 이해하고 사용할
          수 있도록 인터랙션을 설계하고 구현합니다.
        </p>
        <p data-reveal>
          보이는 모습만큼 사용할 때의 감각을 중요하게 생각합니다. 반응의 속도와{' '}
          <span className={styles.wordGroup}>
            <button
              ref={timingRef}
              type="button"
              className={`${styles.phrase} ${styles.timing}`}
              aria-label="움직임의 타이밍, 눌러서 움직임 체험하기"
              onPointerEnter={event => {
                if (
                  event.pointerType !== 'touch' &&
                  matchMedia('(hover: hover) and (pointer: fine)').matches
                ) {
                  playTiming();
                }
              }}
              onClick={event => {
                playTiming(
                  event.detail === 0
                    ? InputOrigin.Keyboard
                    : InputOrigin.Pointer
                );
                setStatus(
                  matchMedia('(prefers-reduced-motion: reduce)').matches
                    ? '움직임 줄이기 설정에 따라 정적인 피드백을 제공합니다.'
                    : event.detail === 0
                      ? '타이밍 체험을 선택했습니다.'
                      : '움직임의 타이밍을 재생했습니다.'
                );
              }}
            >
              움직임의 타이밍
              <span
                ref={traceRef}
                className={styles.trace}
                aria-hidden="true"
              />
              <span
                ref={dotRef}
                className={styles.traceDot}
                aria-hidden="true"
              />
            </button>
            을
          </span>{' '}
          실험하고, 접근성과 성능을 함께 살핍니다. 이해를 돕는 움직임은 정교하게
          다듬고, 사용을 방해하는 움직임은 덜어냅니다.
        </p>
        <p data-reveal>
          아이디어를 직접 구현하고 반복해서 사용해 보며, 작은 어색함까지 다듬는
          데 기꺼이 시간을 씁니다. 그렇게 쌓인 디테일이{' '}
          <strong className={styles.inkMark}>제품 고유의 사용감</strong>을
          만들고, 사용자가 그 제품을 다시 선택하는 이유가 된다고 믿습니다.
        </p>
      </div>
      <div ref={signoffRef} className={styles.signoff} data-reveal>
        <button
          type="button"
          className={styles.signature}
          aria-label="bendd 서명 다시 그리기"
          onClick={event =>
            replaySignature(
              event.detail === 0 ? InputOrigin.Keyboard : InputOrigin.Pointer
            )
          }
        >
          <svg viewBox="4.09543 -0.09 4.999 3.196" aria-hidden="true">
            <path
              ref={signatureRef}
              d={signaturePath}
              stroke="currentColor"
              strokeWidth="0.1"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <nav
          ref={preview.navRef}
          className={styles.socials}
          aria-label="소셜 링크"
        >
          {(
            ['github', 'youtube', 'mail'] satisfies Array<keyof typeof links>
          ).map(key => {
            const item = links[key];
            const SocialIcon = item.icon;
            return (
              <a
                key={key}
                className={styles.social}
                href={item.href}
                target={key === 'mail' ? undefined : '_blank'}
                rel={key === 'mail' ? undefined : 'noopener noreferrer'}
                aria-label={item.label}
                {...(key === 'mail'
                  ? {
                      onFocus: preview.dismiss,
                      onPointerEnter: preview.dismiss,
                    }
                  : preview.triggerProps(key))}
              >
                <SocialIcon aria-hidden="true" />
              </a>
            );
          })}
        </nav>
      </div>
      <aside
        ref={preview.panelRef}
        hidden
        id={preview.id}
        role="region"
        aria-label={`${selected.title} 미리보기`}
        aria-hidden={!preview.active}
        className={styles.popover}
        data-open={Boolean(preview.active)}
        onPointerEnter={preview.keepOpen}
        onPointerLeave={preview.leave}
      >
        <div ref={preview.contentRef} className={styles.popContent}>
          {preview.rendered === 'youtube' && (
            <div className={styles.channelArt}>
              <Youtube aria-hidden="true" />
            </div>
          )}
          <div className={styles.previewHead}>
            {preview.rendered === 'github' && <Icon aria-hidden="true" />}
            <div>
              <h2>
                {preview.rendered === 'github' ? 'jaem1n207' : '@ben_jaemin'}
              </h2>
              <p>
                {preview.rendered === 'github'
                  ? 'GitHub · Software Engineer'
                  : 'YouTube'}
              </p>
            </div>
          </div>
          {preview.rendered === 'youtube' && (
            <p className={styles.previewDescription}>
              직접 만든 제품을 사용하는 모습을 영상으로 올립니다.
            </p>
          )}
          {preview.rendered === 'github' && (
            <>
              <p className={styles.previewDescription}>
                직접 만들고 다듬어 온 웹 도구와
                <br />
                오픈 소스 코드를 기록합니다.
              </p>
              <a
                className={styles.repo}
                href="https://github.com/jaem1n207/synchronize-tab-scrolling"
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={preview.active ? 0 : -1}
              >
                <span className={styles.repoTitle}>
                  <BookOpen aria-hidden="true" />
                  synchronize-tab-scrolling
                </span>
                <p>두 탭의 스크롤을 함께 맞추는 브라우저 확장.</p>
              </a>
            </>
          )}
          <div className={styles.previewFooter}>
            <span>
              {preview.rendered === 'github'
                ? 'github.com/jaem1n207'
                : 'youtube.com/@ben_jaemin'}
            </span>
            <a
              href={selected.href}
              tabIndex={preview.active ? 0 : -1}
              target="_blank"
              rel="noopener noreferrer"
            >
              {preview.rendered === 'github' ? '프로필 열기' : '채널 열기'}
              <ArrowUpRight aria-hidden="true" />
            </a>
          </div>
        </div>
      </aside>
      <span className={styles.srOnly} role="status" aria-live="polite">
        {status}
      </span>
    </header>
  );
}
