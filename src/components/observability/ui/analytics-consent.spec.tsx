import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsConsentControl } from '@/components/observability/ui/analytics-consent';
import {
  AnalyticsConsent,
  CONSENT_KEY,
} from '@/components/observability/lib/analytics';

vi.mock('@/hooks/use-prefers-reduced-motion', () => ({
  usePrefersReducedMotion: () => true,
}));

function advance(ms: number) {
  act(() => vi.advanceTimersByTime(ms));
}
function startReading() {
  fireEvent.scroll(window);
  advance(150);
}
function content() {
  return render(
    <main>
      <button>본문 버튼</button>
      <article data-engagement-content="">본문</article>
      <AnalyticsConsentControl />
    </main>
  );
}
function openSettings() {
  fireEvent.click(screen.getByRole('button', { name: '쿠키 설정' }));
  return screen.getByRole('dialog', { name: '쿠키 설정' });
}

describe('개인정보 설정', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'performance',
        'requestAnimationFrame',
        'cancelAnimationFrame',
      ],
    });
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-TEST123');
    localStorage.clear();
    sessionStorage.clear();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 100, 640, 200)
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('읽기를 시작하기 전에는 선택을 요구하거나 포커스를 옮기지 않는다', () => {
    content();
    const bodyButton = screen.getByRole('button', { name: '본문 버튼' });
    bodyButton.focus();
    expect(screen.queryByRole('button', { name: /분석 쿠키 허용/ })).toBeNull();
    expect(screen.getByRole('button', { name: '쿠키 설정' })).toBeTruthy();
    startReading();
    expect(screen.getByRole('button', { name: /분석 쿠키 허용/ })).toBeTruthy();
    expect(document.activeElement).toBe(bodyButton);
    expect(document.body.style.overflow).not.toBe('hidden');
    expect(document.querySelector('[data-privacy-backdrop]')).toBeNull();
    expect(document.querySelector('[data-bendd-analytics]')).toBeNull();
  });

  it('숨겨진 탭에서는 짧은 콘텐츠의 안내를 띄우지 않는다', () => {
    content();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    fireEvent(document, new Event('visibilitychange'));
    advance(20_000);
    expect(screen.queryByRole('button', { name: /거부하기/ })).toBeNull();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    fireEvent(document, new Event('visibilitychange'));
    advance(10_200);
    expect(screen.getByRole('button', { name: /거부하기/ })).toBeTruthy();
  });

  it('닫기는 거부로 저장하지 않고 같은 세션에서 다시 요청하지 않는다', () => {
    const view = content();
    startReading();
    fireEvent.click(screen.getByRole('button', { name: '나중에 선택하기' }));
    advance(250);
    expect(localStorage.getItem(CONSENT_KEY)).toBeNull();
    view.unmount();
    content();
    startReading();
    advance(15_000);
    expect(screen.queryByRole('button', { name: /거부하기/ })).toBeNull();
  });

  it.each([
    ['분석 쿠키 허용', AnalyticsConsent.Granted, '이용 분석을 허용했어요.'],
    ['거부하기', AnalyticsConsent.Denied, '분석 쿠키를 사용하지 않아요.'],
  ])(
    '선택 %s를 저장하고 같은 영역에서 확인 후 사라진다',
    (label, choice, feedback) => {
      content();
      startReading();
      fireEvent.click(screen.getByRole('button', { name: label }));
      expect(localStorage.getItem(CONSENT_KEY)).toBe(choice);
      expect(screen.getByRole('status').textContent).toContain(feedback);
      expect(screen.queryByRole('button', { name: label })).toBeNull();
      advance(3_000);
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
      fireEvent(document, new Event('visibilitychange'));
      advance(60_000);
      expect(screen.getByRole('status').textContent).toContain(feedback);
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
      fireEvent(document, new Event('visibilitychange'));
      advance(500);
      expect(screen.getByRole('status').textContent).toContain(feedback);
      advance(1_000);
      expect(screen.queryByRole('status')).toBeNull();
      expect(screen.getByRole('button', { name: '쿠키 설정' })).toBeTruthy();
    }
  );

  it('상세 설정에서만 배경을 막고 Escape로 원래 버튼에 돌아온다', () => {
    const view = content();
    const trigger = screen.getByRole('button', { name: '쿠키 설정' });
    trigger.focus();
    const dialog = openSettings();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.querySelector('[data-privacy-backdrop]')).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');
    expect(view.container.inert).toBe(true);
    expect(dialog.contains(document.activeElement)).toBe(true);
    const buttons = within(dialog).getAllByRole('button');
    const last = buttons[buttons.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(buttons[0]);
    fireEvent.keyDown(document, { key: 'Escape' });
    advance(250);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
    expect(view.container.inert).toBe(false);
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: '쿠키 설정' })
    );
  });

  it('안내에서 상세를 닫으면 카드와 원래 설정 버튼으로 돌아온다', () => {
    content();
    startReading();
    const trigger = screen.getByRole('button', { name: '쿠키 설정' });
    trigger.focus();
    openSettings();
    fireEvent.keyDown(document, { key: 'Escape' });
    advance(250);
    expect(screen.getByRole('button', { name: /거부하기/ })).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: '쿠키 설정' })
    );
  });

  it('이미 거부한 사용자도 설정을 열어 동등한 선택을 바꿀 수 있다', () => {
    localStorage.setItem(CONSENT_KEY, AnalyticsConsent.Denied);
    content();
    startReading();
    expect(screen.queryByRole('button', { name: /거부하기/ })).toBeNull();
    const dialog = openSettings();
    const reject = within(dialog).getByRole('button', { name: /거부하기/ });
    expect(reject.hasAttribute('disabled')).toBe(false);
    expect(reject.getAttribute('aria-pressed')).toBe('true');
    expect(reject.textContent).toContain('현재 선택');
    expect(
      dialog.querySelector('[data-privacy-scroll]')?.textContent
    ).not.toContain('현재 선택');
    fireEvent.click(
      within(dialog).getByRole('button', { name: /분석 쿠키 허용/ })
    );
    expect(localStorage.getItem(CONSENT_KEY)).toBe(AnalyticsConsent.Granted);
    expect(screen.getByRole('status').textContent).toContain(
      '이용 분석을 허용했어요.'
    );
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('관심 있는 상세 정보만 펼치고 보관 기간과 수집 항목을 찾을 수 있다', () => {
    content();
    const dialog = openSettings();
    const retention = within(dialog).getByRole('button', {
      name: /데이터는 얼마나 보관하나요/,
    });
    expect(retention.getAttribute('aria-expanded')).toBe('false');
    expect(within(dialog).queryByText('마지막 활동부터 14개월')).toBeNull();
    fireEvent.click(retention);
    advance(250);
    expect(retention.getAttribute('aria-expanded')).toBe('true');
    const region = within(dialog).getByRole('region', {
      name: /데이터는 얼마나 보관하나요/,
    });
    expect(within(region).getAllByText('14개월')).toHaveLength(1);
    expect(within(region).getByText('마지막 활동부터 14개월')).toBeTruthy();
    const collection = within(dialog).getByRole('button', {
      name: /어떤 정보를 살펴보나요/,
    });
    fireEvent.click(collection);
    advance(250);
    expect(
      within(dialog)
        .getByRole('region', { name: /어떤 정보를 살펴보나요/ })
        .querySelectorAll('li').length
    ).toBeGreaterThan(3);
    expect(retention.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(retention);
    advance(250);
    expect(
      within(dialog).queryByRole('region', {
        name: /데이터는 얼마나 보관하나요/,
      })
    ).toBeNull();
  });

  it('저장이 실패하면 성공 확인을 표시하지 않는다', () => {
    content();
    startReading();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    fireEvent.click(screen.getByRole('button', { name: /분석 쿠키 허용/ }));
    expect(screen.getByRole('status').textContent).toContain(
      '선택을 저장하지 못했어요'
    );
    expect(localStorage.getItem(CONSENT_KEY)).toBeNull();
    expect(screen.getByRole('button', { name: /분석 쿠키 허용/ })).toBeTruthy();
  });

  it('다른 탭의 선택이 반영되면 오래된 안내를 제거한다', () => {
    content();
    startReading();
    localStorage.setItem(CONSENT_KEY, AnalyticsConsent.Denied);
    fireEvent(
      window,
      new StorageEvent('storage', {
        key: CONSENT_KEY,
        newValue: AnalyticsConsent.Denied,
      })
    );
    advance(250);
    expect(screen.queryByRole('button', { name: /거부하기/ })).toBeNull();
    const dialog = openSettings();
    expect(
      within(dialog)
        .getByRole('button', { name: /거부하기/ })
        .getAttribute('aria-pressed')
    ).toBe('true');
  });
});
