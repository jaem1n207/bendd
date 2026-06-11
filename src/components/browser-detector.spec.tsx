import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { BrowserDetector, getBrowserClassName } from './browser-detector';

const UA = {
  chromeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
  chromeIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.6422.51 Mobile/15E148 Safari/604.1',
  whaleMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Whale/3.26.244.21 Safari/537.36',
  whaleAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Whale/3.0.1.2 Mobile Safari/537.36',
  edgeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
  edgeAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 EdgA/124.0.2478.104',
  edgeIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/124.2478.89 Version/17.0 Mobile/15E148 Safari/604.1',
  operaWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 OPR/110.0.0.0',
  operaAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36 OPR/76.2.4027.73374',
  vivaldiLinux:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Vivaldi/6.7.3329.31',
  vivaldiAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 Vivaldi/6.7.3335.89',
  firefoxWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  firefoxAndroid:
    'Mozilla/5.0 (Android 14; Mobile; rv:126.0) Gecko/126.0 Firefox/126.0',
  firefoxIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/126.0 Mobile/15E148 Safari/605.1.15',
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
  safariIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1',
} as const;

describe('getBrowserClassName — 데스크톱', () => {
  it.each([
    ['Chrome (Windows)', UA.chromeWindows, 'browser-chrome'],
    ['Whale (Mac)', UA.whaleMac, 'browser-whale'],
    ['Edge (Windows)', UA.edgeWindows, 'browser-edge'],
    ['Opera (Windows)', UA.operaWindows, 'browser-opera'],
    ['Vivaldi (Linux)', UA.vivaldiLinux, 'browser-vivaldi'],
    ['Firefox (Windows)', UA.firefoxWindows, 'browser-firefox'],
    ['Safari (Mac)', UA.safariMac, 'browser-safari'],
  ])('%s → %s', (_label, ua, expected) => {
    expect(getBrowserClassName(ua)).toBe(expected);
  });
});

describe('getBrowserClassName — 모바일', () => {
  it.each([
    ['Chrome (Android)', UA.chromeAndroid, 'browser-mobile-chrome'],
    ['Chrome (iOS, CriOS)', UA.chromeIOS, 'browser-mobile-chrome'],
    ['Whale (Android)', UA.whaleAndroid, 'browser-mobile-whale'],
    ['Edge (Android, EdgA)', UA.edgeAndroid, 'browser-mobile-edge'],
    ['Edge (iOS, EdgiOS)', UA.edgeIOS, 'browser-mobile-edge'],
    ['Opera (Android, OPR)', UA.operaAndroid, 'browser-mobile-opera'],
    ['Vivaldi (Android)', UA.vivaldiAndroid, 'browser-mobile-vivaldi'],
    ['Firefox (Android)', UA.firefoxAndroid, 'browser-mobile-firefox'],
    ['Firefox (iOS, FxiOS)', UA.firefoxIOS, 'browser-mobile-firefox'],
    ['Safari (iOS)', UA.safariIOS, 'browser-mobile-safari'],
  ])('%s → %s', (_label, ua, expected) => {
    expect(getBrowserClassName(ua)).toBe(expected);
  });
});

describe('getBrowserClassName — 감지 순서', () => {
  it('Whale UA는 Chrome/Safari 토큰을 포함해도 whale로 매칭된다', () => {
    expect(UA.whaleMac).toContain('Chrome/');
    expect(UA.whaleMac).toContain('Safari/');
    expect(getBrowserClassName(UA.whaleMac)).toBe('browser-whale');
  });

  it('Edge/Opera/Vivaldi UA는 Chrome 토큰을 포함해도 자기 이름으로 매칭된다', () => {
    expect(getBrowserClassName(UA.edgeWindows)).toBe('browser-edge');
    expect(getBrowserClassName(UA.operaWindows)).toBe('browser-opera');
    expect(getBrowserClassName(UA.vivaldiLinux)).toBe('browser-vivaldi');
  });

  it('Safari는 Chrome 계열 UA에 매칭되지 않고 순수 WebKit UA에만 매칭된다', () => {
    expect(getBrowserClassName(UA.chromeWindows)).not.toBe('browser-safari');
    expect(getBrowserClassName(UA.safariMac)).toBe('browser-safari');
  });
});

describe('getBrowserClassName — 미지원 UA', () => {
  it('Samsung Internet은 Chrome 토큰을 포함하지만 null을 반환한다', () => {
    const samsungUA =
      'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36';
    expect(getBrowserClassName(samsungUA)).toBeNull();
  });

  it('브라우저가 아닌 UA는 null을 반환한다', () => {
    expect(getBrowserClassName('curl/8.4.0')).toBeNull();
    expect(getBrowserClassName('')).toBeNull();
  });
});

describe('BrowserDetector 컴포넌트', () => {
  const originalUserAgent = window.navigator.userAgent;

  function setUserAgent(ua: string) {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: ua,
      configurable: true,
    });
  }

  afterEach(() => {
    setUserAgent(originalUserAgent);
    document.documentElement.className = '';
  });

  it('navigator.userAgent 기반 클래스를 documentElement에 추가한다', () => {
    setUserAgent(UA.safariIOS);
    render(<BrowserDetector />);
    expect(
      document.documentElement.classList.contains('browser-mobile-safari')
    ).toBe(true);
  });

  it('감지 실패 시 클래스를 추가하지 않는다', () => {
    setUserAgent('curl/8.4.0');
    render(<BrowserDetector />);
    expect(document.documentElement.className).toBe('');
  });
});
