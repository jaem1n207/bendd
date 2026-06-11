'use client';

import { useLayoutEffect } from 'react';

type BrowserName =
  | 'chrome'
  | 'edge'
  | 'firefox'
  | 'opera'
  | 'safari'
  | 'vivaldi'
  | 'whale';

// 매칭 순서가 곧 우선순위다. Whale/Edge/Opera/Vivaldi는 UA에 Chrome 토큰을
// 포함하는 Chromium 파생이므로 Chrome보다 먼저, Safari는 대부분의 WebKit UA에
// 포함되므로 마지막에 검사한다. iOS는 CriOS(Chrome)/FxiOS(Firefox)/EdgiOS(Edge)/
// OPiOS(Opera) 토큰을 사용한다.
const BROWSER_MATCHERS: ReadonlyArray<readonly [BrowserName, RegExp]> = [
  ['whale', /\bwhale\//i],
  ['edge', /\bedg(?:e|a|ios)?\//i],
  ['opera', /\bopr\/|\bopios\/|\bopera\b/i],
  ['vivaldi', /\bvivaldi\//i],
  ['chrome', /\b(?:chrome|crios|crmo)\//i],
  ['firefox', /\b(?:firefox|fxios)\//i],
  ['safari', /\bsafari\//i],
];

/**
 * ua-parser-js의 browser.name을 lowercase + 공백→하이픈 변환한 결과와
 * 호환되는 클래스 이름을 반환한다. 예: "Mobile Safari" → browser-mobile-safari
 * globals.css에 정의된 browser-{name} / browser-mobile-{name} 셀렉터와 짝을 이룬다.
 */
export function getBrowserClassName(ua: string): string | null {
  // Samsung Internet은 UA에 Chrome 토큰을 포함하지만 별도 브라우저다.
  // 전용 스프라이트가 없으므로 기본 아이콘으로 폴백시킨다.
  if (/\bsamsungbrowser\//i.test(ua)) return null;

  const matched = BROWSER_MATCHERS.find(([, pattern]) => pattern.test(ua));
  if (!matched) return null;

  const isMobile = /mobi/i.test(ua);
  return `browser-${isMobile ? 'mobile-' : ''}${matched[0]}`;
}

export function BrowserDetector() {
  useLayoutEffect(() => {
    const className = getBrowserClassName(navigator.userAgent);
    if (className) {
      document.documentElement.classList.add(className);
    }
  }, []);

  return null;
}
