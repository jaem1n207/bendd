import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HomeProfile } from '@/components/profile';

let HomeMotion: (typeof import('@/components/home/ui/home-motion'))['HomeMotion'];

let reducedMotion = false;
const subscribers = new Set<() => void>();
const observers: TestObserver[] = [];
type TestAnimation = {
  cancel: ReturnType<typeof vi.fn>;
  onfinish: (() => void) | null;
};
const animations: TestAnimation[] = [];
const animatedElements: HTMLElement[] = [];
const animate = vi.fn(function (
  this: HTMLElement,
  _frames: Keyframe[],
  _options: KeyframeAnimationOptions
) {
  const animation: TestAnimation = { cancel: vi.fn(), onfinish: null };
  animations.push(animation);
  animatedElements.push(this);
  return animation;
});
const originalAnimate = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'animate'
);

class TestObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '0px';
  readonly thresholds: number[];
  readonly targets = new Set<Element>();
  observe = vi.fn((target: Element) => this.targets.add(target));
  unobserve = vi.fn((target: Element) => this.targets.delete(target));
  disconnect = vi.fn(() => this.targets.clear());
  takeRecords = () => [];

  constructor(
    private callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ) {
    this.thresholds = Array.isArray(options?.threshold)
      ? options.threshold
      : [options?.threshold ?? 0];
    observers.push(this);
  }

  intersect(...targets: Element[]) {
    const bounds = new DOMRect(0, 780, 100, 40);
    this.callback(
      targets
        .filter(target => this.targets.has(target))
        .map(target => {
          if (target instanceof HTMLElement) {
            target.dataset.top = String(780 + window.scrollY);
          }
          return {
            target,
            isIntersecting: true,
            intersectionRatio: 0.5,
            boundingClientRect: bounds,
            intersectionRect: bounds,
            rootBounds: null,
            time: 0,
          };
        }),
      this
    );
  }
}

function currentObserver() {
  const observer = observers.at(-1);
  if (!observer) {
    throw new Error('No intersection observer was created');
  }
  return observer;
}

function Content() {
  return (
    <HomeMotion>
      <section data-reveal-group="profile">
        <p data-reveal data-top="100">
          첫 번째 내용
        </p>
        <p data-reveal data-top="200">
          두 번째 내용
        </p>
        <p data-reveal data-top="1000">
          세 번째 내용
        </p>
        <p data-reveal data-top="1200">
          <a href="#fourth">네 번째 내용</a>
        </p>
      </section>
    </HomeMotion>
  );
}

function AnnotatedContent({ top = 100 }: { top?: number }) {
  return (
    <HomeMotion>
      <section data-reveal-group="writing" data-reveal-sequence="list">
        <h2 data-reveal data-reveal-kind="heading" data-top={top}>
          묶음 제목
        </h2>
        <div data-reveal data-reveal-kind="note" data-top={top + 40}>
          <p data-note-accent>손글씨 메모</p>
          <svg aria-hidden="true" />
        </div>
        <p data-reveal data-reveal-kind="writing" data-top={top + 80}>
          본문 하나
        </p>
        <p data-reveal data-reveal-kind="writing" data-top={top + 120}>
          본문 둘
        </p>
      </section>
    </HomeMotion>
  );
}

function noteContainer() {
  const note = screen.getByText('손글씨 메모').parentElement;
  if (!note) {
    throw new Error('Missing note container');
  }
  return note;
}

function WritingScrollContent({ profileCount = 4 }: { profileCount?: number }) {
  return (
    <HomeMotion>
      <section data-reveal-group="profile">
        {Array.from({ length: profileCount }, (_, index) => (
          <p key={index} data-reveal data-top={100 + index * 10}>
            Profile {index}
          </p>
        ))}
      </section>
      <section data-reveal-group="writing" data-reveal-sequence="list">
        <h2 data-reveal data-reveal-kind="heading" data-top="1600">
          Writing
        </h2>
        <div data-reveal data-reveal-kind="note" data-top="1640">
          <p data-note-accent>Writing 메모</p>
        </div>
        {[1, 2, 3].map(index => (
          <p
            key={index}
            data-reveal
            data-reveal-kind="writing"
            data-top={1640 + index * 40}
          >
            글 {index}
          </p>
        ))}
      </section>
    </HomeMotion>
  );
}

function writingTargets() {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-reveal-group="writing"] [data-reveal]'
    )
  );
}

function animationCall(element: HTMLElement) {
  const call = animate.mock.calls[animatedElements.indexOf(element)];
  if (!call) {
    throw new Error('Expected a reveal animation');
  }
  return call;
}

beforeEach(async () => {
  vi.resetModules();
  ({ HomeMotion } = await import('@/components/home/ui/home-motion'));
  reducedMotion = false;
  subscribers.clear();
  observers.length = 0;
  animate.mockClear();
  animations.length = 0;
  animatedElements.length = 0;
  vi.stubGlobal('innerHeight', 800);
  vi.stubGlobal('innerWidth', 1200);
  vi.stubGlobal('scrollY', 0);
  vi.spyOn(performance, 'now').mockReturnValue(0);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      return new DOMRect(
        0,
        Number(this.dataset.top ?? 100) - window.scrollY,
        100,
        40
      );
    }
  );
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    value: animate,
  });
  vi.stubGlobal('IntersectionObserver', TestObserver);
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return reducedMotion;
    },
    addEventListener: (_: string, listener: () => void) =>
      subscribers.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      subscribers.delete(listener),
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalAnimate) {
    Object.defineProperty(HTMLElement.prototype, 'animate', originalAnimate);
  } else {
    Reflect.deleteProperty(HTMLElement.prototype, 'animate');
  }
});

describe('home entrance motion', () => {
  it('connects a completed profile entrance to its demo and skips a client return', () => {
    vi.useFakeTimers();
    const view = render(
      <HomeMotion>
        <HomeProfile />
      </HomeMotion>
    );
    const reveals = animations.filter((_, index) =>
      animatedElements[index].hasAttribute('data-reveal')
    );
    act(() => reveals.forEach(animation => animation.onfinish?.()));
    act(() => vi.advanceTimersByTime(120));
    expect(
      screen
        .getByRole('button', { name: /클릭에 대한 피드백/ })
        .getAttribute('data-reacted')
    ).toBe('true');
    view.unmount();
    render(
      <HomeMotion>
        <HomeProfile />
      </HomeMotion>
    );
    act(() => vi.advanceTimersByTime(3000));
    expect(
      screen
        .getByRole('button', { name: /클릭에 대한 피드백/ })
        .hasAttribute('data-reacted')
    ).toBe(false);
  });

  it('signals only normal reveal completion for follow-up demonstrations', () => {
    render(<Content />);
    const first = screen.getByText('첫 번째 내용');
    const second = screen.getByText('두 번째 내용');
    const completed = vi.fn();
    first.addEventListener('home:reveal-complete', completed);
    second.addEventListener('home:reveal-complete', completed);
    act(() => animations[animatedElements.indexOf(first)].onfinish?.());
    expect(completed).toHaveBeenCalledTimes(1);
    expect(first.dataset.revealState).toBe('visible');
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(second.dataset.revealState).toBe('visible');
    expect(completed).toHaveBeenCalledTimes(1);
  });

  it('starts from the CSS entrance state without a post-paint opacity reset', () => {
    render(<Content />);
    const first = screen.getByText('첫 번째 내용');
    const second = screen.getByText('두 번째 내용');
    expect(first.dataset.revealState).toBe('initial');
    expect(second.dataset.revealState).toBe('initial');
    expect(animate.mock.calls).toHaveLength(2);
    expect(animate.mock.calls[1]?.[1]).toMatchObject({
      delay: 36,
      duration: 900,
    });
    expect(currentObserver().targets.has(first)).toBe(false);
    expect(animate).toHaveBeenCalled();
  });

  it('does not fade already visible content backwards after delayed hydration', () => {
    const computedStyle = window.getComputedStyle;
    vi.spyOn(window, 'getComputedStyle').mockImplementation(element => {
      const style = computedStyle(element);
      style.opacity = '1';
      return style;
    });
    render(<Content />);
    expect(screen.getByText('첫 번째 내용').dataset.revealState).toBe(
      'visible'
    );
    expect(screen.getByText('두 번째 내용').dataset.revealState).toBe(
      'visible'
    );
    const third = screen.getByText('세 번째 내용');
    expect(third.dataset.revealState).toBe('pending');
    currentObserver().intersect(third);
    expect(third.dataset.revealState).toBe('entering');
    expect(animate.mock.calls.at(-1)?.[1]).toMatchObject({
      delay: 0,
      duration: 900,
    });
    expect(animate).toHaveBeenCalledTimes(1);
  });

  it('waits for offscreen content, then appends its full entrance once', () => {
    render(<Content />);
    const third = screen.getByText('세 번째 내용');
    const observer = currentObserver();
    expect(third.dataset.revealState).toBe('pending');
    expect(animate).toHaveBeenCalledTimes(2);
    expect(observer.thresholds).toEqual([0]);
    observer.intersect(third);
    expect(third.dataset.revealState).toBe('entering');
    expect(animate.mock.calls.at(-1)?.[1]).toMatchObject({
      delay: 72,
      duration: 900,
    });
    expect(observer.unobserve).toHaveBeenCalledWith(third);
    act(() => animations.at(-1)?.onfinish?.());
    expect(third.dataset.revealState).toBe('visible');
    observer.intersect(third);
    expect(third.dataset.revealState).toBe('visible');
  });

  it('starts Writing from its own full sequence while the profile is still playing', () => {
    render(<WritingScrollContent />);
    const profileAnimations = [...animations];
    const targets = writingTargets();
    vi.mocked(performance.now).mockReturnValue(500);
    fireEvent.scroll(window);
    // IntersectionObserver delivery order must not determine choreography.
    currentObserver().intersect(...[...targets].reverse());
    expect(targets.map(element => animationCall(element)[1].delay)).toEqual([
      0, 216, 36, 96, 156,
    ]);
    for (const element of targets) {
      expect(animationCall(element)[1]).toMatchObject({
        duration: 900,
        easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      });
      expect(animationCall(element)[0][0].opacity).toBe(0);
    }
    expect(animationCall(screen.getByText('글 1'))[0][0]).toMatchObject({
      filter: 'blur(8px)',
      transform: 'translateY(6px)',
    });
    expect(animations.slice(0, 4)).toEqual(profileAnimations);
    expect(
      profileAnimations.every(animation => !animation.cancel.mock.calls.length)
    ).toBe(true);
    currentObserver().intersect(...targets);
    expect(animate).toHaveBeenCalledTimes(9);
  });

  it('gives a late first Writing visit the same full sequence', () => {
    render(<WritingScrollContent />);
    act(() => [...animations].forEach(animation => animation.onfinish?.()));
    vi.mocked(performance.now).mockReturnValue(5000);
    const targets = writingTargets();
    currentObserver().intersect(...targets);
    expect(targets.map(element => animationCall(element)[1].delay)).toEqual([
      0, 216, 36, 96, 156,
    ]);
    expect(
      targets.every(element => animationCall(element)[1].duration === 900)
    ).toBe(true);
  });

  it('connects split Writing observations without replacing scheduled animations', () => {
    render(<WritingScrollContent />);
    const [heading, note, first, second, third] = writingTargets();
    const observer = currentObserver();
    vi.mocked(performance.now).mockReturnValue(500);
    observer.intersect(heading);
    const headingAnimation = animations.at(-1);
    vi.mocked(performance.now).mockReturnValue(516);
    observer.intersect(second, first);
    expect(animationCall(first)[1].delay).toBe(20);
    expect(animationCall(second)[1].delay).toBe(80);
    vi.mocked(performance.now).mockReturnValue(532);
    observer.intersect(note, third);
    expect(animationCall(third)[1].delay).toBe(124);
    expect(animationCall(note)[1].delay).toBe(184);
    expect(headingAnimation?.cancel).not.toHaveBeenCalled();
    expect(animate).toHaveBeenCalledTimes(9);
  });

  it('connects new groups after the last scheduled start without waiting for completion', () => {
    render(<WritingScrollContent />);
    vi.mocked(performance.now).mockReturnValue(50);
    currentObserver().intersect(...writingTargets());
    expect(animationCall(screen.getByText('Writing'))[1].delay).toBe(178);
    expect(animationCall(screen.getByText('글 1'))[1].delay).toBe(214);
    expect(
      animations
        .slice(0, 4)
        .every(animation => !animation.cancel.mock.calls.length)
    ).toBe(true);
  });

  it('shares the blur budget across initial and entering content, then releases it', () => {
    render(<WritingScrollContent profileCount={12} />);
    const [heading, note, first, second, third] = writingTargets();
    vi.mocked(performance.now).mockReturnValue(500);
    currentObserver().intersect(heading, first);
    expect(animationCall(heading)[0][0].filter).toBe('blur(0px)');
    expect(animationCall(first)[0][0].filter).toBe('blur(0px)');
    expect(animationCall(first)[1].duration).toBe(900);
    act(() => animations[0].onfinish?.());
    vi.mocked(performance.now).mockReturnValue(550);
    currentObserver().intersect(second, third, note);
    expect(animationCall(second)[0][0].filter).toBe('blur(8px)');
    expect(animationCall(third)[0][0].filter).toBe('blur(0px)');
    expect(animationCall(note)[0][0].filter).toBe('blur(0px)');
  });

  it('settles keyboard targets immediately and resumes only unseen pointer entrances', () => {
    const view = render(<Content />);
    const observer = currentObserver();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(screen.getByText('첫 번째 내용').dataset.revealState).toBe(
      'visible'
    );
    observer.intersect(screen.getByText('세 번째 내용'));
    expect(screen.getByText('세 번째 내용').dataset.revealState).toBe(
      'visible'
    );
    fireEvent.pointerDown(window);
    const fourth = screen.getByText('네 번째 내용').closest('p');
    if (!fourth) {
      throw new Error('Missing reveal container');
    }
    observer.intersect(fourth);
    expect(fourth.dataset.revealState).toBe('entering');
    fireEvent.focusIn(screen.getByRole('link'));
    expect(fourth.dataset.revealState).toBe('visible');
    view.unmount();
    expect(observer.disconnect).toHaveBeenCalled();
  });

  it('settles all content on reduced motion without hiding it again when the preference changes', () => {
    render(<Content />);
    act(() => {
      reducedMotion = true;
      subscribers.forEach(listener => listener());
    });
    for (const element of document.querySelectorAll<HTMLElement>(
      '[data-reveal]'
    )) {
      expect(element.dataset.revealState).toBe('visible');
    }
    act(() => {
      reducedMotion = false;
      subscribers.forEach(listener => listener());
    });
    expect(screen.getByText('세 번째 내용').dataset.revealState).toBe(
      'visible'
    );
    expect(currentObserver().targets.size).toBe(0);
  });

  it('skips entrances on client navigation back to home', () => {
    const firstVisit = render(<Content />);
    firstVisit.unmount();
    const observerCount = observers.length;
    render(<Content />);
    expect(observers).toHaveLength(observerCount);
    for (const element of document.querySelectorAll<HTMLElement>(
      '[data-reveal]'
    )) {
      expect(element.dataset.revealState).toBe('visible');
    }
  });

  it.each([
    { name: 'http://localhost/article', type: 'navigate' },
    { name: 'http://localhost/', type: 'back_forward' },
  ])('skips a document reached via $name ($type)', entry => {
    vi.stubGlobal('performance', {
      now: () => 0,
      getEntriesByType: () => [entry],
    });
    render(<Content />);
    expect(animate).not.toHaveBeenCalled();
    expect(screen.getByText('세 번째 내용').dataset.revealState).toBe(
      'visible'
    );
  });

  it('keeps content readable if IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<Content />);
    expect(screen.getByText('세 번째 내용').dataset.revealState).toBe(
      'visible'
    );
  });

  it('keeps the original sequence through repeated page scrolls and offscreen travel', () => {
    render(<Content />);
    vi.stubGlobal('scrollY', 500);
    fireEvent.scroll(window);
    fireEvent.scroll(window);
    expect(animate).toHaveBeenCalledTimes(2);
    expect(animate.mock.calls[1]?.[1]).toMatchObject({
      duration: 900,
      delay: 36,
    });
    expect(
      animations.every(animation => animation.cancel.mock.calls.length === 0)
    ).toBe(true);
    expect(screen.getByText('첫 번째 내용').dataset.revealState).toBe(
      'initial'
    );
    expect(screen.getByText('세 번째 내용').dataset.revealState).toBe(
      'pending'
    );
    act(() => animations[0].onfinish?.());
    expect(screen.getByText('첫 번째 내용').dataset.revealState).toBe(
      'visible'
    );
    expect(animations[0].cancel).toHaveBeenCalledOnce();
  });

  it('starts normally in a viewport already scrolled down on document load', () => {
    vi.stubGlobal('scrollY', 900);
    render(<Content />);
    expect(screen.getByText('첫 번째 내용').dataset.revealState).toBe(
      'pending'
    );
    expect(screen.getByText('세 번째 내용').dataset.revealState).toBe(
      'initial'
    );
    expect(animate).toHaveBeenCalledTimes(2);
    expect(animate.mock.calls[1]?.[1]).toMatchObject({
      duration: 900,
      delay: 36,
    });
  });

  it('keeps playing when a touch gesture or click starts on static text or empty space', () => {
    render(<Content />);
    const first = screen.getByText('첫 번째 내용');
    fireEvent.scroll(first);
    fireEvent.pointerDown(first, { pointerType: 'touch' });
    fireEvent.click(first);
    fireEvent.pointerDown(document.body);
    fireEvent.click(document.body);
    expect(animate).toHaveBeenCalledTimes(2);
    expect(first.dataset.revealState).toBe('initial');
    expect(
      animations.every(animation => animation.cancel.mock.calls.length === 0)
    ).toBe(true);
  });

  it.each(['ArrowDown', 'PageDown', 'Home', 'End', ' ', 'ArrowUp'])(
    'preserves timing when %s scrolls the page from its body',
    key => {
      render(<Content />);
      fireEvent.keyDown(document.body, { key, shiftKey: key === ' ' });
      fireEvent.scroll(window);
      expect(screen.getByText('첫 번째 내용').dataset.revealState).toBe(
        'initial'
      );
      expect(animations[0].cancel).not.toHaveBeenCalled();
    }
  );

  it('still prepares activated controls immediately without settling unrelated home content', () => {
    render(<Content />);
    const link = screen.getByRole('link');
    fireEvent.click(link);
    expect(link.closest('p')?.dataset.revealState).toBe('visible');
    expect(screen.getByText('첫 번째 내용').dataset.revealState).toBe(
      'initial'
    );
    fireEvent.keyDown(link, { key: 'ArrowDown' });
    expect(screen.getByText('첫 번째 내용').dataset.revealState).toBe(
      'visible'
    );
  });

  it('settles motion when an actual control outside home is activated', () => {
    render(
      <>
        <button>외부 컨트롤</button>
        <Content />
      </>
    );
    fireEvent.click(screen.getByRole('button', { name: '외부 컨트롤' }));
    expect(screen.getByText('첫 번째 내용').dataset.revealState).toBe(
      'visible'
    );
  });

  it('adds one text-only accent after a note naturally finishes its entrance', () => {
    render(<AnnotatedContent />);
    expect(animate.mock.calls[1]?.[1]).toMatchObject({
      duration: 900,
      delay: 156,
    });
    act(() => animations[1].onfinish?.());
    expect(noteContainer().dataset.revealState).toBe('visible');
    expect(animatedElements[4]).toBe(screen.getByText('손글씨 메모'));
    expect(animate.mock.calls[4]?.[0]).toEqual([
      expect.objectContaining({ transform: 'rotate(0deg)', offset: 0 }),
      expect.objectContaining({ transform: 'rotate(-1.2deg)', offset: 0.35 }),
      expect.objectContaining({ transform: 'rotate(0.4deg)', offset: 0.7 }),
      expect.objectContaining({ transform: 'rotate(0deg)', offset: 1 }),
    ]);
    expect(animate.mock.calls[4]?.[1]).toMatchObject({
      duration: 360,
      iterations: 1,
    });
    fireEvent.scroll(window);
    expect(animations[4].cancel).not.toHaveBeenCalled();
    act(() => animations[4].onfinish?.());
    expect(animations[4].cancel).toHaveBeenCalledOnce();
    fireEvent.pointerDown(screen.getByText('손글씨 메모'));
    fireEvent.mouseEnter(screen.getByText('손글씨 메모'));
    currentObserver().intersect(noteContainer());
    expect(animate).toHaveBeenCalledTimes(5);
  });

  it('halves the note accent angle on narrow screens', () => {
    vi.stubGlobal('innerWidth', 390);
    render(<AnnotatedContent />);
    act(() => animations[1].onfinish?.());
    expect(animate.mock.calls[4]?.[0][1]).toMatchObject({
      transform: 'rotate(-0.6deg)',
    });
    expect(animate.mock.calls[4]?.[0][2]).toMatchObject({
      transform: 'rotate(0.2deg)',
    });
  });

  it('orders an entering note after its visible body even when the observer reports it first', () => {
    render(<AnnotatedContent top={1000} />);
    expect(animate).not.toHaveBeenCalled();
    currentObserver().intersect(
      noteContainer(),
      screen.getByText('묶음 제목'),
      screen.getByText('본문 하나'),
      screen.getByText('본문 둘')
    );
    const note = noteContainer();
    expect(animationCall(note)[1]).toMatchObject({
      duration: 900,
      delay: 156,
    });
    expect(animate.mock.calls[0]?.[1]).toMatchObject({
      duration: 900,
      delay: 0,
    });
    act(() => animations[animatedElements.indexOf(note)].onfinish?.());
    expect(animatedElements[4]).toBe(screen.getByText('손글씨 메모'));
  });

  it('does not add an accent when a note completes outside the viewport', () => {
    render(<AnnotatedContent />);
    vi.stubGlobal('scrollY', 600);
    act(() => animations[1].onfinish?.());
    expect(animate).toHaveBeenCalledTimes(4);
    expect(noteContainer().dataset.revealState).toBe('visible');
  });

  it.each(['keyboard', 'reduce', 'pagehide'])(
    'cancels an active accent for %s without starting another',
    mode => {
      render(<AnnotatedContent />);
      act(() => animations[1].onfinish?.());
      const accent = animations[4];
      expect(accent).toBeDefined();
      if (mode === 'keyboard') {
        fireEvent.keyDown(document.body, { key: 'Tab' });
      }
      if (mode === 'pagehide') {
        fireEvent(window, new Event('pagehide'));
      }
      if (mode === 'reduce') {
        act(() => {
          reducedMotion = true;
          subscribers.forEach(listener => listener());
        });
      }
      expect(accent.cancel).toHaveBeenCalledOnce();
      expect(animate).toHaveBeenCalledTimes(5);
      expect(noteContainer().dataset.revealState).toBe('visible');
    }
  );

  it('never accents a note made visible by keyboard access or reduced motion', () => {
    render(<AnnotatedContent />);
    fireEvent.keyDown(document.body, { key: 'Tab' });
    expect(animations[1].onfinish).toBeNull();
    expect(noteContainer().dataset.revealState).toBe('visible');
    act(() => {
      reducedMotion = true;
      subscribers.forEach(listener => listener());
    });
    expect(animate).toHaveBeenCalledTimes(4);
  });

  it('releases an active accent on unmount', () => {
    const view = render(<AnnotatedContent />);
    act(() => animations[1].onfinish?.());
    const accent = animations[4];
    expect(accent).toBeDefined();
    view.unmount();
    expect(accent.cancel).toHaveBeenCalledOnce();
  });

  it('clears active animations and pending content before a page is cached', () => {
    render(<Content />);
    fireEvent(window, new Event('pagehide'));
    expect(
      animations.every(animation => animation.cancel.mock.calls.length === 1)
    ).toBe(true);
    expect(currentObserver().targets.size).toBe(0);
    expect(screen.getByText('세 번째 내용').dataset.revealState).toBe(
      'visible'
    );
  });

  it('ignores repeated theme hydration but settles an actual theme change', async () => {
    render(<Content />);
    const originalClass = document.documentElement.className;
    await act(async () => {
      document.documentElement.className = originalClass;
    });
    expect(screen.getByText('첫 번째 내용').dataset.revealState).toBe(
      'initial'
    );
    await act(async () => {
      document.documentElement.classList.toggle('dark');
    });
    expect(screen.getByText('첫 번째 내용').dataset.revealState).toBe(
      'visible'
    );
    document.documentElement.className = originalClass;
  });

  it('falls back to visible content when the animation API is unavailable', () => {
    Reflect.deleteProperty(HTMLElement.prototype, 'animate');
    render(<Content />);
    expect(screen.getByText('세 번째 내용').dataset.revealState).toBe(
      'visible'
    );
  });

  it('preserves intro timing and reconnects pending content after StrictMode cleanup', () => {
    render(
      <StrictMode>
        <Content />
      </StrictMode>
    );
    expect(animate.mock.calls.at(-1)?.[1]).toMatchObject({
      delay: 36,
      duration: 900,
    });
    expect(screen.getByText('두 번째 내용').dataset.revealState).toBe(
      'initial'
    );
    const third = screen.getByText('세 번째 내용');
    expect(currentObserver().targets.has(third)).toBe(true);
    currentObserver().intersect(third);
    expect(third.dataset.revealState).toBe('entering');
    expect(animate).toHaveBeenCalled();
  });
});
