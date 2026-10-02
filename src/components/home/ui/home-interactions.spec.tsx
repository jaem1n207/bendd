import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CopyEmail } from '@/components/home/ui/copy-email';
import { TextShuffleDemo } from '@/components/home/ui/craft-demos';
import { ExtensionInstallMenu } from '@/components/home/ui/extension-install-menu';
import { ScrollSyncDemo } from '@/components/home/ui/scroll-sync-demo';

let reducedMotion = false;
const subscribers = new Set<() => void>();
const cancelFrame = vi.fn();
const requestFrame = vi.fn(() => 42);

beforeEach(() => {
  reducedMotion = false;
  subscribers.clear();
  cancelFrame.mockClear();
  requestFrame.mockClear();
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return query.includes('prefers-reduced-motion') ? reducedMotion : true;
    },
    media: query,
    addEventListener: (_: string, listener: () => void) =>
      subscribers.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      subscribers.delete(listener),
  }));
  vi.stubGlobal('requestAnimationFrame', requestFrame);
  vi.stubGlobal('cancelAnimationFrame', cancelFrame);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('home interaction accessibility', () => {
  it('loads the muted looping video on demand, then removes it and restores the reading position', () => {
    render(<ScrollSyncDemo />);
    expect(
      screen.queryByTitle('Synchronize Tab Scrolling 사용 영상')
    ).toBeNull();
    fireEvent.change(screen.getByRole('slider', { name: '읽기 위치' }), {
      target: { value: '72' },
    });
    expect(screen.getByText('72%')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: '사용 영상 보기' }));
    const video = screen.getByTitle('Synchronize Tab Scrolling 사용 영상');
    expect(screen.getByText('영상을 불러오는 중')).toBeDefined();
    fireEvent.load(video);
    expect(screen.queryByText('영상을 불러오는 중')).toBeNull();
    const url = new URL(video.getAttribute('src') ?? '');
    expect(url.origin).toBe('https://www.youtube.com');
    expect(url.pathname).toBe('/embed/cpLPy5OlJ8g');
    expect(url.searchParams.get('autoplay')).toBe('1');
    expect(url.searchParams.get('mute')).toBe('1');
    expect(url.searchParams.get('loop')).toBe('1');
    expect(url.searchParams.get('playlist')).toBe('cpLPy5OlJ8g');
    expect(url.searchParams.get('playsinline')).toBe('1');
    expect(video.getAttribute('allow')).toContain('autoplay');
    expect(screen.queryByRole('slider')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '동작 체험하기' }));
    expect(
      screen.queryByTitle('Synchronize Tab Scrolling 사용 영상')
    ).toBeNull();
    expect(screen.getByRole('slider').getAttribute('type')).toBe('range');
    expect(screen.getByText('72%')).toBeDefined();
  });

  it('keeps a reopened video playing when a previous exit transition is interrupted', () => {
    vi.useFakeTimers();
    render(<ScrollSyncDemo />);
    fireEvent.click(screen.getByRole('button', { name: '사용 영상 보기' }), {
      detail: 1,
    });
    const video = screen.getByTitle('Synchronize Tab Scrolling 사용 영상');
    fireEvent.click(screen.getByRole('button', { name: '동작 체험하기' }), {
      detail: 1,
    });
    act(() => vi.advanceTimersByTime(100));
    fireEvent.click(screen.getByRole('button', { name: '사용 영상 보기' }));
    act(() => vi.advanceTimersByTime(240));
    expect(screen.getByTitle('Synchronize Tab Scrolling 사용 영상')).toBe(
      video
    );
    fireEvent.click(screen.getByRole('button', { name: '동작 체험하기' }), {
      detail: 1,
    });
    act(() => vi.advanceTimersByTime(240));
    expect(
      screen.queryByTitle('Synchronize Tab Scrolling 사용 영상')
    ).toBeNull();
  });

  it('offers the three supported browser stores by keyboard and dismisses with Escape', async () => {
    render(<ExtensionInstallMenu />);
    const trigger = screen.getByRole('button', { name: '브라우저에 추가' });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const chromium = await screen.findByRole('menuitem', {
      name: /Chrome 및 Chromium/,
    });
    expect(chromium.getAttribute('href')).toContain(
      'chromewebstore.google.com'
    );
    expect(
      screen.getByRole('menuitem', { name: /^Firefox/ }).getAttribute('href')
    ).toContain('addons.mozilla.org');
    expect(
      screen
        .getByRole('menuitem', { name: /^Microsoft Edge/ })
        .getAttribute('href')
    ).toContain('microsoftedge.microsoft.com');
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
    expect(screen.getByText('Safari는 지원하지 않습니다.')).toBeDefined();
    fireEvent.keyDown(chromium, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('stops the outgoing video immediately when reduced motion is enabled during the fade', () => {
    vi.useFakeTimers();
    render(<ScrollSyncDemo />);
    fireEvent.click(screen.getByRole('button', { name: '사용 영상 보기' }), {
      detail: 1,
    });
    fireEvent.click(screen.getByRole('button', { name: '동작 체험하기' }), {
      detail: 1,
    });
    expect(
      screen.getByTitle('Synchronize Tab Scrolling 사용 영상')
    ).toBeDefined();
    act(() => {
      reducedMotion = true;
      subscribers.forEach(listener => listener());
    });
    expect(
      screen.queryByTitle('Synchronize Tab Scrolling 사용 영상')
    ).toBeNull();
  });

  it('cancels active text motion when the user enables reduced motion', () => {
    render(<TextShuffleDemo />);
    fireEvent.click(
      screen.getByRole('button', { name: '텍스트 셔플 애니메이션 재생' })
    );
    expect(requestFrame).toHaveBeenCalledOnce();
    act(() => {
      reducedMotion = true;
      subscribers.forEach(listener => listener());
    });
    expect(cancelFrame).toHaveBeenCalledWith(42);
    expect(screen.getByText('안녕, World! 2026 :)')).toBeDefined();
    fireEvent.click(
      screen.getByRole('button', { name: '텍스트 셔플 애니메이션 재생' })
    );
    expect(requestFrame).toHaveBeenCalledOnce();
  });

  it('cancels scheduled text animation on unmount', () => {
    const view = render(<TextShuffleDemo />);
    fireEvent.click(
      screen.getByRole('button', { name: '텍스트 셔플 애니메이션 재생' })
    );
    view.unmount();
    expect(cancelFrame).toHaveBeenCalledWith(42);
  });

  it('shuffles Hangul, letters, numbers, and symbols within their own character types', () => {
    const frames = new Map<number, FrameRequestCallback>();
    let nextId = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++nextId, callback);
      return nextId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    const snapshots: string[] = [];

    render(<TextShuffleDemo />);
    const trigger = screen.getByRole('button', {
      name: '텍스트 셔플 애니메이션 재생',
    });
    fireEvent.click(trigger);

    for (let now = 0; now <= 1600 && frames.size; now += 34) {
      const pending = [...frames.values()];
      frames.clear();
      act(() => pending.forEach(callback => callback(now)));
      snapshots.push(trigger.textContent ?? '');
    }

    expect(snapshots.some(text => text.includes('가'))).toBe(true);
    expect(snapshots.some(text => text.includes('Aaaa'))).toBe(true);
    expect(snapshots.some(text => text.includes('0000'))).toBe(true);
    expect(snapshots.some(text => text.endsWith('!!'))).toBe(true);
    expect(trigger.textContent).toBe('안녕, World! 2026 :)');
    expect(frames.size).toBe(0);
    random.mockRestore();
  });

  it('reports clipboard success and makes a denied copy recoverable', async () => {
    const writeText = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(<CopyEmail email="hello@example.com" />);
    fireEvent.click(screen.getByRole('button', { name: '이메일 주소 복사' }));
    expect(await screen.findByText('복사했어요')).toBeDefined();
    expect(writeText).toHaveBeenCalledWith('hello@example.com');
    fireEvent.click(
      screen.getByRole('button', { name: '이메일 주소 복사 완료' })
    );
    expect(
      await screen.findByText('메일 주소를 직접 복사해 주세요')
    ).toBeDefined();
  });
});
