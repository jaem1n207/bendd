'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState } from 'react';

import { GlobeReadiness } from '@/components/connection-globe/consts/playback';
import {
  distanceInMeters,
  formatDistance,
  NEARBY_DISTANCE_METERS,
  SEOUL,
} from '@/components/connection-globe/lib/geometry';
import { useGlobeScene } from '@/components/connection-globe/model/use-globe-scene';
import { useVisitorLocation } from '@/components/connection-globe/model/use-visitor-location';
import styles from '@/components/connection-globe/ui/connection-globe.module.css';
import { TimeDifference } from '@/components/connection-globe/ui/time-difference';

export function ConnectionGlobe() {
  const instructionId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [nearbyPulse, setNearbyPulse] = useState(0);
  const location = useVisitorLocation(
    near ? GlobeReadiness.Ready : GlobeReadiness.Waiting
  );
  const { ready, complete, presented, fallback } = useGlobeScene(
    stageRef,
    location.location,
    near && location.status !== 'loading'
      ? GlobeReadiness.Ready
      : GlobeReadiness.Waiting
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      entries => {
        if (!entries.some(entry => entry.isIntersecting)) {
          return;
        }
        setNear(true);
        observer.disconnect();
      },
      { rootMargin: '300px' }
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const meters = location.location
    ? distanceInMeters(location.location, SEOUL)
    : null;
  const distance =
    meters !== null ? formatDistance(meters).replace(' ', '') : null;
  const nearby = meters !== null && meters <= NEARBY_DISTANCE_METERS;

  return (
    <section
      className={styles.section}
      aria-labelledby="home-connection-title"
      data-connection-globe
      data-reveal-group="connection"
    >
      <header
        className={styles.heading}
        data-globe-heading
        data-reveal
        data-reveal-kind="heading"
        data-reveal-repeat="visit"
      >
        <span className={styles.eyebrow}>A SMALL CONNECTION</span>
        <h2 id="home-connection-title">서울에서 만들고, 다듬고 있습니다.</h2>
      </header>
      <figure className={styles.figure}>
        <div
          ref={stageRef}
          className={styles.stage}
          data-ready={ready}
          data-fallback={fallback}
          data-interactive={ready && complete && !fallback}
          role="group"
          aria-label={
            location.location
              ? '방문자와 서울을 잇는 지구본'
              : '서울을 표시한 지구본'
          }
          aria-describedby={instructionId}
          tabIndex={ready && complete && !fallback ? 0 : -1}
        >
          <div className={styles.waiting} />
          <div className={styles.scene} aria-hidden="true">
            <div className={styles.canvas} data-canvas-host />
            <div className={styles.fallbackGlobe} data-fallback-globe>
              <span />
              <span />
              <span />
            </div>
            <svg className={styles.overlay} data-route-overlay>
              <path className={styles.route} data-route-path />
            </svg>
            <div
              className={styles.marker}
              data-visitor-marker
              hidden={location.status !== 'ready'}
            >
              <span className={styles.visitorPin} />
              <span className={styles.visitorName}>방문자</span>
            </div>
            <div className={styles.marker} data-seoul-marker hidden={nearby}>
              <span className={styles.rabbitPin}>
                <Image
                  src="/globe/seoul-avatar.png"
                  data-seoul-avatar
                  alt=""
                  width={30}
                  height={30}
                  unoptimized
                />
              </span>
            </div>
            <div
              className={styles.distancePosition}
              data-distance-label
              hidden={location.status !== 'ready' || nearby}
            >
              <span className={styles.distance}>
                <span data-distance-value>0 km</span>
              </span>
            </div>
          </div>
          <div
            className={`${styles.marker} ${styles.nearbyAnchor}`}
            data-nearby-anchor
            hidden={!nearby}
          >
            {nearby && (
              <>
                <div
                  key={nearbyPulse}
                  className={styles.sharedRings}
                  data-shared-pulse={nearbyPulse}
                  aria-hidden="true"
                >
                  <span />
                  <span />
                  <span />
                </div>
                <span className={styles.anchorPin} aria-hidden="true" />
                <button
                  type="button"
                  className={styles.sharedButton}
                  data-nearby-button
                  disabled={!ready || !complete}
                  aria-label="방문자와 재민의 공유 반경 다시 재생"
                  onClick={event => {
                    event.currentTarget.parentElement?.setAttribute(
                      'data-rings-animate',
                      String(
                        !window.matchMedia('(prefers-reduced-motion: reduce)')
                          .matches
                      )
                    );
                    setNearbyPulse(value => value + 1);
                  }}
                >
                  <span className={styles.sharedPeople} aria-hidden="true">
                    <span className={styles.sharedVisitor}>
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle cx="12" cy="8" r="3" fill="currentColor" />
                        <path
                          d="M5.5 20v-2a6.5 6.5 0 0 1 13 0v2"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                    <span className={styles.sharedHost}>
                      <Image
                        src="/globe/seoul-avatar.png"
                        data-seoul-avatar
                        alt=""
                        width={30}
                        height={30}
                        unoptimized
                      />
                    </span>
                  </span>
                  <span className={styles.sharedNames} aria-hidden="true">
                    방문자 <span>·</span> 재민
                  </span>
                </button>
                <div className={styles.sharedLabel} aria-hidden="true">
                  <strong>
                    {meters === 0
                      ? '같은 위치로 표시돼요'
                      : '가까운 곳에서 만났네요'}
                  </strong>
                  <span>
                    서울 부근 · <span data-nearby-distance-value>0 m</span>
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
        <p
          className={styles.interactionHint}
          data-visible={complete && !fallback}
          aria-hidden="true"
        >
          드래그해서 둘러보기
        </p>
        <span id={instructionId} className="sr-only">
          연결이 완료되면 방향키로 지구본을 회전할 수 있습니다. Home 키로 처음
          구도로 돌아갑니다.
        </span>
        <figcaption className={styles.caption}>
          <p aria-live="polite" aria-atomic="true" className={styles.message}>
            {location.status === 'unavailable' ? (
              '방문자님의 위치를 확인하지 못했지만, 서울에서 반갑게 인사드려요.'
            ) : complete && distance ? (
              <>
                지금 우리는 <strong>약 {distance}</strong> 떨어져 있네요.
              </>
            ) : (
              '당신이 있는 곳과 제가 있는 곳을 이어 볼게요.'
            )}
          </p>
          <TimeDifference
            timeZone={location.location?.timeZone}
            readiness={
              complete && presented
                ? GlobeReadiness.Ready
                : GlobeReadiness.Waiting
            }
          />
          {distance && !nearby && (
            <p className={styles.connectionNote} data-visible={complete}>
              그래도 웹에서는 이렇게 빠르게 만날 수 있죠.
            </p>
          )}
          <span className={styles.note}>
            IP 기반 추정 위치 · 실제 위치와 다를 수 있어요
          </span>
          <noscript>
            <style>{`[data-connection-globe] figure {
              animation: none !important;
              opacity: 1 !important;
              visibility: visible !important;
            }`}</style>
            <p>JavaScript를 켜면 서울까지의 추정 거리를 볼 수 있어요.</p>
          </noscript>
        </figcaption>
      </figure>
    </section>
  );
}
