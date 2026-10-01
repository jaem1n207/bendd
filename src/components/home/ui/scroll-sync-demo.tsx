'use client';

import { ArrowUpRight, Link2, MousePointer2, Play } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent,
} from 'react';

import styles from '@/components/home/ui/home-studio.module.css';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

export function ScrollSyncDemo() {
  const id = useId();
  const [showVideo, setShowVideo] = useState(false);
  const [videoMounted, setVideoMounted] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [animateSwap, setAnimateSwap] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const slider = useRef<HTMLInputElement>(null);
  const output = useRef<HTMLOutputElement>(null);
  const frame = useRef(0);
  const position = useRef(20);

  const setPosition = useCallback((value: number) => {
    const next = Math.max(0, Math.min(100, Math.round(value)));
    position.current = next;
    if (slider.current) {
      slider.current.value = String(next);
    }
    if (output.current) {
      output.current.value = `${next}%`;
    }
    stage.current
      ?.querySelectorAll<HTMLElement>('[data-reading-content]')
      .forEach(content => {
        const viewport = content.parentElement;
        if (!viewport) {
          return;
        }
        const distance = Math.max(
          0,
          content.scrollHeight - viewport.clientHeight + 32
        );
        content.style.transform = `translateY(${(-distance * next) / 100}px)`;
      });
  }, []);

  useEffect(() => {
    if (showVideo || !stage.current) {
      return;
    }
    setPosition(position.current);
    if (!('ResizeObserver' in window)) {
      return;
    }
    const observer = new ResizeObserver(() => setPosition(position.current));
    observer.observe(stage.current);
    stage.current
      .querySelectorAll('[data-reading-content]')
      .forEach(content => observer.observe(content));
    return () => observer.disconnect();
  }, [setPosition, showVideo]);

  useEffect(() => {
    cancelAnimationFrame(frame.current);
    return () => cancelAnimationFrame(frame.current);
  }, [reducedMotion, showVideo]);

  useEffect(() => {
    if (showVideo || !videoMounted) {
      return;
    }
    if (reducedMotion !== false || !animateSwap) {
      setVideoMounted(false);
      return;
    }
    // Keep the outgoing frame only for the fade, then stop playback entirely.
    const timeout = window.setTimeout(() => setVideoMounted(false), 240);
    return () => window.clearTimeout(timeout);
  }, [animateSwap, reducedMotion, showVideo, videoMounted]);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (
      reducedMotion !== false ||
      event.pointerType !== 'mouse' ||
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ) {
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const next =
      ((event.clientY - bounds.top - 24) / (bounds.height - 48)) * 100;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => setPosition(next));
  };

  return (
    <div className={styles.demo}>
      <div className={styles.demoToolbar}>
        <span className={styles.eyebrow}>
          {showVideo ? 'PRODUCT IN USE' : 'SCROLL IN SYNC'}
        </span>
        <button
          type="button"
          className={styles.textButton}
          aria-pressed={showVideo}
          aria-controls={`${id}-visual`}
          onClick={event => {
            const shouldAnimate = event.detail > 0 && reducedMotion === false;
            setAnimateSwap(shouldAnimate);
            if (!showVideo) {
              if (!videoMounted) {
                setVideoLoaded(false);
                setVideoMounted(true);
              }
            } else if (!shouldAnimate) {
              setVideoMounted(false);
            }
            setShowVideo(value => !value);
          }}
        >
          {showVideo ? '동작 체험하기' : '사용 영상 보기'}
          {showVideo ? (
            <MousePointer2 aria-hidden="true" />
          ) : (
            <Play aria-hidden="true" />
          )}
        </button>
      </div>
      <div
        id={`${id}-visual`}
        className={styles.demoVisual}
        data-motion={animateSwap ? 'animated' : 'immediate'}
      >
        <div
          className={styles.demoLayer}
          data-active={!showVideo}
          aria-hidden={showVideo}
        >
          <div
            ref={stage}
            className={styles.syncStage}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => cancelAnimationFrame(frame.current)}
            aria-label="두 문서의 스크롤 동기화 시연"
          >
            <div className={styles.document}>
              <div className={styles.documentBar}>
                <span>ORIGINAL</span>
                <span aria-hidden="true">•••</span>
              </div>
              <div className={styles.documentViewport}>
                <div data-reading-content lang="en">
                  <strong>A little less friction.</strong>
                  <p>Good tools begin with the things we do every day.</p>
                  <p>
                    <mark>Two pages. One place.</mark>
                  </p>
                  <p>
                    Read the original and its translation together, without
                    losing your place.
                  </p>
                  <p>Small details help us stay focused on what matters.</p>
                  <strong>Built for everyday use.</strong>
                  <p>Keep your reading flow, from one paragraph to the next.</p>
                </div>
              </div>
            </div>
            <span className={styles.syncConnection} aria-hidden="true">
              <Link2 />
            </span>
            <div className={styles.document}>
              <div className={styles.documentBar}>
                <span>TRANSLATION</span>
                <span aria-hidden="true">•••</span>
              </div>
              <div className={styles.documentViewport}>
                <div data-reading-content>
                  <strong>불편함을 조금 덜어내는 일.</strong>
                  <p>좋은 도구는 매일 반복하는 작은 일에서 시작됩니다.</p>
                  <p>
                    <mark>두 페이지. 같은 위치.</mark>
                  </p>
                  <p>읽던 곳을 놓치지 않고 원문과 번역문을 함께 읽습니다.</p>
                  <p>작은 디테일이 중요한 내용에 집중하도록 돕습니다.</p>
                  <strong>일상에서 쓰는 도구.</strong>
                  <p>문장에서 다음 문장으로, 읽기의 흐름을 이어갑니다.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          className={`${styles.demoLayer} ${styles.productVideo}`}
          data-active={showVideo}
          aria-hidden={!showVideo}
        >
          {videoMounted && (
            <>
              {!videoLoaded && (
                <div className={styles.videoLoading} role="status">
                  <Play aria-hidden="true" />
                  <span>영상을 불러오는 중</span>
                </div>
              )}
              <iframe
                src="https://www.youtube.com/embed/cpLPy5OlJ8g?autoplay=1&mute=1&loop=1&playlist=cpLPy5OlJ8g&playsinline=1&rel=0"
                title="Synchronize Tab Scrolling 사용 영상"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                tabIndex={showVideo ? 0 : -1}
                onLoad={() => setVideoLoaded(true)}
              />
            </>
          )}
        </div>
      </div>
      <div className={styles.demoControls}>
        {showVideo ? (
          <>
            <p>직접 사용하는 모습 · 무음 반복 재생</p>
            <a
              className={styles.videoLink}
              href="https://www.youtube.com/watch?v=cpLPy5OlJ8g"
              target="_blank"
              rel="noopener noreferrer"
            >
              YouTube에서 보기
              <ArrowUpRight aria-hidden="true" />
            </a>
          </>
        ) : (
          <>
            <label htmlFor={`${id}-progress`}>읽기 위치</label>
            <input
              ref={slider}
              id={`${id}-progress`}
              type="range"
              min={0}
              max={100}
              defaultValue={20}
              onChange={event => setPosition(Number(event.currentTarget.value))}
            />
            <output ref={output} htmlFor={`${id}-progress`} aria-live="off">
              20%
            </output>
          </>
        )}
      </div>
    </div>
  );
}
