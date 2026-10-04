import Link from 'next/link';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ path: '/article/a' }));
vi.mock('next/navigation', () => ({ usePathname: () => state.path }));
import { EngagementTracker } from '@/components/observability/ui/engagement-tracker';
import {
  AnalyticsConsent,
  CONSENT_KEY,
  DEMO_EVENT,
  setConsent,
} from '@/components/observability/lib/analytics';

function advance(ms: number) {
  act(() => vi.advanceTimersByTime(ms));
}

function commands() {
  return (window.dataLayer ?? []).map(item => Array.from(Object(item)));
}
function events(name: string) {
  return commands().filter(item => item[0] === 'event' && item[1] === name);
}
function Content() {
  return (
    <main>
      <article data-engagement-content="">
        <Link
          href="/article/b?token=private"
          onClick={event => event.preventDefault()}
        >
          다음 글
        </Link>
      </article>
      <EngagementTracker />
    </main>
  );
}

describe('참여 이벤트 수집', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'performance',
        'requestAnimationFrame',
        'cancelAnimationFrame',
      ],
    });
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-TEST123');
    localStorage.clear();
    window.dataLayer = [];
    window.gtag = function () {
      window.dataLayer?.push(arguments);
    };
    state.path = '/article/a';
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, -900, 700, 2000)
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    document
      .querySelectorAll('[data-bendd-analytics]')
      .forEach(element => element.remove());
  });
  it('동의 전에는 스크립트와 이벤트를 생성하지 않는다', () => {
    const view = render(<Content />);
    advance(35_000);
    fireEvent.click(view.getByText('다음 글'));
    advance(10);
    expect(document.querySelector('[data-bendd-analytics]')).toBeNull();
    expect(events('engaged_read')).toHaveLength(0);
    expect(events('related_article_click')).toHaveLength(0);
  });
  it('탭이 숨겨진 시간은 읽기 시간에 포함하지 않고 한 번만 보낸다', () => {
    localStorage.setItem(CONSENT_KEY, AnalyticsConsent.Granted);
    render(<Content />);
    advance(10_000);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    fireEvent(document, new Event('visibilitychange'));
    advance(60_000);
    expect(events('engaged_read')).toHaveLength(0);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    fireEvent(document, new Event('visibilitychange'));
    advance(20_010);
    expect(events('engaged_read')).toHaveLength(1);
    advance(10_000);
    expect(events('engaged_read')).toHaveLength(1);
  });
  it('탐색·데모 완료는 중복을 제거하고 입력 내용이나 쿼리를 보내지 않는다', () => {
    localStorage.setItem(CONSENT_KEY, AnalyticsConsent.Granted);
    const view = render(<Content />);
    fireEvent.click(view.getByText('다음 글'));
    fireEvent.click(view.getByText('다음 글'));
    act(() => {
      window.dispatchEvent(
        new CustomEvent(DEMO_EVENT, { detail: 'shuffle-letters' })
      );
      window.dispatchEvent(
        new CustomEvent(DEMO_EVENT, { detail: 'shuffle-letters' })
      );
      window.dispatchEvent(
        new CustomEvent(DEMO_EVENT, { detail: 'private input@text' })
      );
    });
    advance(10);
    expect(events('related_article_click')).toHaveLength(1);
    expect(events('related_article_click')[0][2]).toMatchObject({
      content_path: '/article/a',
      target_path: '/article/b',
    });
    expect(events('demo_complete')).toHaveLength(1);
    expect(JSON.stringify(events('demo_complete'))).not.toContain('private');
  });
  it('페이지가 종료되면 대기 이벤트를 한 번 전송한다', () => {
    localStorage.setItem(CONSENT_KEY, AnalyticsConsent.Granted);
    const view = render(<Content />);
    fireEvent.click(view.getByText('다음 글'));
    fireEvent(window, new Event('pagehide'));
    advance(10);
    expect(events('related_article_click')).toHaveLength(1);
  });

  it('철회하면 전송 대기 중인 이벤트도 폐기한다', () => {
    localStorage.setItem(CONSENT_KEY, AnalyticsConsent.Granted);
    const view = render(<Content />);
    fireEvent.click(view.getByText('다음 글'));
    act(() => setConsent(AnalyticsConsent.Denied));
    advance(35_000);
    expect(events('related_article_click')).toHaveLength(0);
    expect(events('engaged_read')).toHaveLength(0);
  });
  it('다른 탭의 동의 철회도 적용한다', () => {
    localStorage.setItem(CONSENT_KEY, AnalyticsConsent.Granted);
    render(<Content />);
    advance(10);
    localStorage.setItem(CONSENT_KEY, AnalyticsConsent.Denied);
    fireEvent(
      window,
      new StorageEvent('storage', {
        key: CONSENT_KEY,
        newValue: AnalyticsConsent.Denied,
      })
    );
    expect(Reflect.get(window, 'ga-disable-G-TEST123')).toBe(true);
    advance(35_000);
    expect(events('engaged_read')).toHaveLength(0);
  });

  it('SPA 경로 변경 시 읽기 시간과 중복 상태를 초기화한다', () => {
    localStorage.setItem(CONSENT_KEY, AnalyticsConsent.Granted);
    const view = render(<Content />);
    advance(20_000);
    state.path = '/article/b';
    view.rerender(<Content />);
    advance(10_010);
    expect(events('engaged_read')).toHaveLength(0);
    advance(20_000);
    expect(events('engaged_read')).toHaveLength(1);
    expect(events('engaged_read')[0][2]).toMatchObject({
      content_path: '/article/b',
    });
  });
});
