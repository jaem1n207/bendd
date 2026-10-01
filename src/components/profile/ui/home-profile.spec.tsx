import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HomeProfile } from '@/components/profile';

let reduced = false;
let coarse = false;
const subscribers = new Set<() => void>();
const cancel = vi.fn();
const animate = vi.fn(() => ({ cancel, onfinish: null }));
const introObservers: IntroObserver[] = [];

class IntroObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '0px';
  readonly thresholds = [0];
  readonly targets = new Set<Element>();
  observe = (target: Element) => this.targets.add(target);
  unobserve = (target: Element) => this.targets.delete(target);
  disconnect = () => this.targets.clear();
  takeRecords = () => [];

  constructor(private callback: IntersectionObserverCallback) {
    introObservers.push(this);
  }

  enter(target: Element) {
    if (!this.targets.has(target)) {
      return;
    }
    const bounds = target.getBoundingClientRect();
    this.callback(
      [
        {
          target,
          isIntersecting: true,
          intersectionRatio: 1,
          boundingClientRect: bounds,
          intersectionRect: bounds,
          rootBounds: null,
          time: 0,
        },
      ],
      this
    );
  }
}

function finishReveal(button: HTMLElement) {
  const paragraph = button.closest<HTMLElement>('[data-reveal]');
  if (!paragraph) {
    throw new Error('Missing profile paragraph');
  }
  paragraph.dataset.revealState = 'visible';
  act(() => {
    paragraph.dispatchEvent(
      new Event('home:reveal-complete', { bubbles: true })
    );
  });
}

function phrases() {
  return {
    feedback: screen.getByRole('button', { name: /클릭에 대한 피드백/ }),
    timing: screen.getByRole('button', { name: /움직임의 타이밍/ }),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  reduced = false;
  coarse = false;
  subscribers.clear();
  cancel.mockClear();
  animate.mockClear();
  introObservers.length = 0;
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return query.includes('prefers-reduced-motion') ? reduced : coarse;
    },
    addEventListener: (_: string, listener: () => void) =>
      subscribers.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      subscribers.delete(listener),
  }));
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: animate,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(Element.prototype, 'animate');
});

describe('profile introduction demonstrations', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', IntroObserver);
    vi.stubGlobal('innerHeight', 800);
    vi.stubGlobal('innerWidth', 1200);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        return new DOMRect(100, Number(this.dataset.top ?? 100), 150, 30);
      }
    );
  });

  it('plays feedback then timing after completed reveals, once, without a live announcement', () => {
    render(<HomeProfile />);
    const { feedback, timing } = phrases();
    finishReveal(feedback);
    finishReveal(timing);
    act(() => vi.advanceTimersByTime(119));
    expect(feedback.hasAttribute('data-reacted')).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(feedback.getAttribute('data-reacted')).toBe('true');
    expect(animate).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(460));
    expect(feedback.hasAttribute('data-reacted')).toBe(false);
    act(() => vi.advanceTimersByTime(279));
    expect(animate).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(animate).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status').textContent).toBe('');
    finishReveal(feedback);
    finishReveal(timing);
    act(() => vi.advanceTimersByTime(3000));
    expect(animate).toHaveBeenCalledTimes(2);
    expect(feedback.hasAttribute('data-reacted')).toBe(false);
  });

  it('waits for the other visible profile reveals to settle before starting', () => {
    render(<HomeProfile />);
    const { feedback, timing } = phrases();
    const paragraph = timing.closest<HTMLElement>('[data-reveal]');
    if (!paragraph) {
      throw new Error('Missing timing paragraph');
    }
    paragraph.dataset.revealState = 'initial';
    finishReveal(feedback);
    act(() => vi.advanceTimersByTime(2000));
    expect(feedback.hasAttribute('data-reacted')).toBe(false);
    finishReveal(timing);
    act(() => vi.advanceTimersByTime(120));
    expect(feedback.getAttribute('data-reacted')).toBe('true');
  });

  it('does not consume an offscreen phrase and plays it after its first visible entrance', () => {
    render(<HomeProfile />);
    const { feedback, timing } = phrases();
    feedback.dataset.top = '1000';
    finishReveal(feedback);
    finishReveal(timing);
    act(() => vi.advanceTimersByTime(2000));
    expect(animate).toHaveBeenCalledTimes(2);
    expect(feedback.hasAttribute('data-reacted')).toBe(false);
    feedback.dataset.top = '100';
    act(() => introObservers.forEach(observer => observer.enter(feedback)));
    act(() => vi.advanceTimersByTime(120));
    expect(feedback.getAttribute('data-reacted')).toBe('true');
  });

  it('rechecks visibility before a queued effect begins', () => {
    render(<HomeProfile />);
    const { feedback } = phrases();
    finishReveal(feedback);
    feedback.dataset.top = '1000';
    act(() => vi.advanceTimersByTime(2000));
    expect(feedback.hasAttribute('data-reacted')).toBe(false);
    feedback.dataset.top = '100';
    act(() => introObservers.forEach(observer => observer.enter(feedback)));
    act(() => vi.advanceTimersByTime(120));
    expect(feedback.getAttribute('data-reacted')).toBe('true');
  });

  it('does not interpret immediate visibility or a return visit as a completed entrance', () => {
    render(<HomeProfile />);
    const { feedback, timing } = phrases();
    for (const button of [feedback, timing]) {
      const paragraph = button.closest<HTMLElement>('[data-reveal]');
      if (paragraph) {
        paragraph.dataset.revealState = 'visible';
      }
      act(() => introObservers.forEach(observer => observer.enter(button)));
    }
    act(() => vi.advanceTimersByTime(5000));
    expect(feedback.hasAttribute('data-reacted')).toBe(false);
    expect(animate).not.toHaveBeenCalled();
  });

  it('gives a direct click priority over automatic playback and preserves its full feedback', () => {
    render(<HomeProfile />);
    const { feedback, timing } = phrases();
    finishReveal(feedback);
    finishReveal(timing);
    act(() => vi.advanceTimersByTime(120));
    fireEvent.click(feedback);
    act(() => vi.advanceTimersByTime(619));
    expect(feedback.getAttribute('data-reacted')).toBe('true');
    act(() => vi.advanceTimersByTime(2000));
    expect(animate).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toBe('클릭에 반응했습니다.');
  });

  it.each(['keyboard', 'reduced motion', 'page exit', 'control activation'])(
    'clears pending demonstrations on %s',
    reason => {
      render(<HomeProfile />);
      const { feedback, timing } = phrases();
      finishReveal(feedback);
      finishReveal(timing);
      if (reason === 'keyboard') {
        fireEvent.keyDown(document.body, { key: 'Tab' });
      }
      if (reason === 'reduced motion') {
        act(() => {
          reduced = true;
          subscribers.forEach(listener => listener());
        });
      }
      if (reason === 'page exit') {
        fireEvent(window, new Event('pagehide'));
      }
      if (reason === 'control activation') {
        fireEvent.click(
          screen.getByRole('button', { name: 'bendd 서명 다시 그리기' })
        );
      }
      act(() => vi.advanceTimersByTime(3000));
      expect(feedback.hasAttribute('data-reacted')).toBe(false);
      expect(animate).not.toHaveBeenCalled();
    }
  );

  it('cancels pending playback on unmount', () => {
    const view = render(<HomeProfile />);
    finishReveal(phrases().feedback);
    view.unmount();
    act(() => vi.advanceTimersByTime(3000));
    expect(animate).not.toHaveBeenCalled();
    expect(subscribers.size).toBe(0);
  });

  it('finishes automatic feedback immediately on reduced motion without restarting it', () => {
    render(<HomeProfile />);
    const { feedback, timing } = phrases();
    finishReveal(feedback);
    finishReveal(timing);
    act(() => vi.advanceTimersByTime(120));
    expect(feedback.getAttribute('data-reacted')).toBe('true');
    act(() => {
      reduced = true;
      subscribers.forEach(listener => listener());
    });
    expect(feedback.hasAttribute('data-reacted')).toBe(false);
    act(() => {
      reduced = false;
      subscribers.forEach(listener => listener());
      vi.advanceTimersByTime(5000);
    });
    expect(animate).not.toHaveBeenCalled();
  });

  it('cancels queued playback on an actual theme change', async () => {
    render(<HomeProfile />);
    const { feedback, timing } = phrases();
    finishReveal(feedback);
    finishReveal(timing);
    const wasDark = document.documentElement.classList.contains('dark');
    await act(async () => {
      document.documentElement.classList.toggle('dark', !wasDark);
    });
    act(() => vi.advanceTimersByTime(3000));
    expect(feedback.hasAttribute('data-reacted')).toBe(false);
    expect(animate).not.toHaveBeenCalled();
    await act(async () => {
      document.documentElement.classList.toggle('dark', wasDark);
    });
  });
});

describe('profile interactions', () => {
  it('opens keyboard previews immediately and preserves Escape dismissal until reactivation', () => {
    render(<HomeProfile />);
    const github = screen.getByRole('link', { name: 'GitHub 프로필' });
    fireEvent.focus(github);
    expect(
      screen.getByRole('region', { name: 'GitHub 미리보기' })
    ).toBeDefined();
    expect(animate).not.toHaveBeenCalled();
    fireEvent.keyDown(github, { key: 'Escape' });
    expect(screen.queryByRole('region')).toBeNull();
    fireEvent.pointerMove(github);
    expect(screen.queryByRole('region')).toBeNull();
    fireEvent.focus(screen.getByRole('link', { name: 'YouTube 채널' }));
    expect(
      screen.getByRole('region', { name: 'YouTube 미리보기' })
    ).toBeDefined();
  });

  it('keeps the card available when focus moves into its action and closes outside', () => {
    render(<HomeProfile />);
    const github = screen.getByRole('link', { name: 'GitHub 프로필' });
    act(() => github.focus());
    const action = screen.getByRole('link', { name: '프로필 열기' });
    act(() => action.focus());
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByRole('region')).toBeDefined();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('opens card actions with an arrow key and returns focus with Escape', () => {
    render(<HomeProfile />);
    const github = screen.getByRole('link', { name: 'GitHub 프로필' });
    act(() => github.focus());
    fireEvent.keyDown(github, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(
      screen.getByRole('link', { name: /synchronize-tab-scrolling/ })
    );
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    });
    expect(document.activeElement).toBe(github);
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('uses a first touch to preview and allows a second touch to follow the actual link', () => {
    coarse = true;
    render(<HomeProfile />);
    const youtube = screen.getByRole('link', { name: 'YouTube 채널' });
    fireEvent.pointerDown(youtube, { pointerType: 'touch' });
    fireEvent.focus(youtube);
    expect(fireEvent.click(youtube, { detail: 1 })).toBe(false);
    expect(
      screen.getByRole('region', { name: 'YouTube 미리보기' })
    ).toBeDefined();
    expect(fireEvent.click(youtube, { detail: 1 })).toBe(true);
    expect(youtube.getAttribute('href')).toBe(
      'https://www.youtube.com/@ben_jaemin'
    );
  });

  it('keeps feedback visible for a full interval after rapid repeated clicks', () => {
    render(<HomeProfile />);
    const feedback = screen.getByRole('button', {
      name: /클릭에 대한 피드백/,
    });
    fireEvent.click(feedback);
    act(() => vi.advanceTimersByTime(500));
    fireEvent.click(feedback);
    act(() => vi.advanceTimersByTime(500));
    expect(feedback.getAttribute('data-reacted')).toBe('true');
    act(() => vi.advanceTimersByTime(121));
    expect(feedback.hasAttribute('data-reacted')).toBe(false);
    expect(screen.getByRole('status').textContent).toBe('클릭에 반응했습니다.');
  });

  it('stops decorative motion when the preference changes and still gives feedback', () => {
    render(<HomeProfile />);
    fireEvent.click(screen.getByRole('button', { name: /움직임의 타이밍/ }), {
      detail: 1,
    });
    expect(animate).toHaveBeenCalledTimes(2);
    act(() => {
      reduced = true;
      subscribers.forEach(listener => listener());
    });
    expect(cancel).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: /움직임의 타이밍/ }), {
      detail: 1,
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'bendd 서명 다시 그리기' }),
      { detail: 1 }
    );
    expect(animate).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status').textContent).toContain('움직임 줄이기');
  });

  it('closes on viewport changes and cleans up timers and motion on unmount', () => {
    const view = render(<HomeProfile />);
    const github = screen.getByRole('link', { name: 'GitHub 프로필' });
    fireEvent.focus(github);
    fireEvent.scroll(window);
    expect(screen.queryByRole('region')).toBeNull();
    fireEvent.focus(github);
    fireEvent.resize(window);
    expect(screen.queryByRole('region')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /움직임의 타이밍/ }), {
      detail: 1,
    });
    view.unmount();
    expect(cancel).toHaveBeenCalledTimes(2);
    expect(subscribers.size).toBe(0);
    act(() => vi.runOnlyPendingTimers());
  });

  it('allows a constrained preview to scroll without dismissing its content', () => {
    render(<HomeProfile />);
    fireEvent.focus(screen.getByRole('link', { name: 'GitHub 프로필' }));
    const panel = screen.getByRole('region', { name: 'GitHub 미리보기' });
    fireEvent.scroll(panel);
    expect(screen.getByRole('region', { name: 'GitHub 미리보기' })).toBe(panel);
  });
});
