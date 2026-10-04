import { afterEach, describe, expect, test, vi } from 'vitest';

import { containPrivacyDialog } from '@/components/observability/lib/privacy-dialog';

const SCROLLBAR_WIDTH = 15;
const VIEWPORT_WIDTH = 1280;
const CONTENT_WIDTH = VIEWPORT_WIDTH - SCROLLBAR_WIDTH;
const ORIGINAL_PADDING = '12px';
const ORIGINAL_OVERFLOW = 'auto';

function createDialog() {
  const root = document.createElement('div');
  root.dataset.privacyRoot = '';
  const panel = document.createElement('aside');
  panel.append(document.createElement('button'));
  root.append(panel);
  document.body.append(root);
  return panel;
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
  document.body.style.cssText = '';
  document.documentElement.style.cssText = '';
});

describe('개인정보 상세 화면의 스크롤 잠금', () => {
  test('스크롤 잠금으로 본문 너비가 늘어나는 경우에만 여백을 보정한다', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(VIEWPORT_WIDTH);
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(
      CONTENT_WIDTH
    );
    vi.spyOn(document.body, 'getBoundingClientRect').mockImplementation(
      () =>
        new DOMRect(
          0,
          0,
          document.body.style.overflow === 'hidden'
            ? VIEWPORT_WIDTH
            : CONTENT_WIDTH,
          2000
        )
    );
    document.body.style.paddingRight = ORIGINAL_PADDING;
    document.body.style.overflow = ORIGINAL_OVERFLOW;

    const release = containPrivacyDialog(createDialog(), vi.fn());
    try {
      expect(document.body.style.overflow).toBe('hidden');
      expect(document.body.style.paddingRight).toBe('27px');
    } finally {
      release();
    }
    expect(document.body.style.overflow).toBe(ORIGINAL_OVERFLOW);
    expect(document.body.style.paddingRight).toBe(ORIGINAL_PADDING);
  });

  test('스크롤바 공간이 유지되면 본문의 기존 여백을 바꾸지 않는다', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(VIEWPORT_WIDTH);
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(
      CONTENT_WIDTH
    );
    vi.spyOn(document.body, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, CONTENT_WIDTH, 2000)
    );
    document.documentElement.style.scrollbarGutter = 'stable';
    document.body.style.paddingRight = ORIGINAL_PADDING;
    document.body.style.overflow = ORIGINAL_OVERFLOW;

    const release = containPrivacyDialog(createDialog(), vi.fn());
    try {
      expect(document.body.style.overflow).toBe('hidden');
      expect(document.body.style.paddingRight).toBe(ORIGINAL_PADDING);
    } finally {
      release();
    }
    expect(document.body.style.overflow).toBe(ORIGINAL_OVERFLOW);
    expect(document.body.style.paddingRight).toBe(ORIGINAL_PADDING);
  });
});
