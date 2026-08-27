import { type RefObject, useEffect } from 'react';

import { querySelectorAll } from '@/lib/dom';
import type {
  HeadingLevel,
  LevelRange,
  MenuItem,
} from '@/mdx/common/table-of-contents/toc';

// resolveHeaders 함수로부터 얻은 앵커 요소의 캐시된 목록
const resolvedHeaders: { element: HTMLHeadingElement; link: string }[] = [];

export function getHeaders(range: LevelRange = [2, 6]): MenuItem[] {
  const headers = querySelectorAll('#BenddDoc :where(h1,h2,h3,h4,h5,h6)')
    .filter(el => {
      if (el === null) {
        throw new Error(
          '설정한 범위 내의 heading 요소를 찾을 수 없어요. `BenddDoc` id를 가진 요소 안에 heading 요소가 있는지 확인해주세요.'
        );
      }
      return el.id && el.hasChildNodes();
    })
    .map(el => ({
      element: el as HTMLHeadingElement,
      level: Number(el!.tagName[1]) as HeadingLevel,
      title: serializeHeader(el!),
      link: '#' + el!.id,
    }));

  return resolveHeaders(headers, range);
}

function serializeHeader(header: Element): string {
  let title = '';
  for (const childNode of header.childNodes) {
    if (childNode.nodeType === Node.ELEMENT_NODE) {
      if ((childNode as Element).classList.contains('header-anchor')) {
        title += childNode.textContent;
      }
    }
  }

  return title.trim();
}

function resolveHeaders(headers: MenuItem[], range: LevelRange): MenuItem[] {
  const [high, low]: [number, number] =
    typeof range === 'number' ? [range, range] : range;

  headers = headers.filter(h => h.level >= high && h.level <= low);
  // 이전에 캐시된 앵커 목록 제거
  resolvedHeaders.length = 0;
  // TOC 렌더링을 위한 범위 내 헤더 목록 업데이트
  for (const { element, link } of headers) {
    resolvedHeaders.push({ element, link });
  }

  const menuItem: MenuItem[] = [];
  // 바깥쪽 루프도 빠져나갈 수 있도록 레이블을 붙임
  outer: for (let i = 0; i < headers.length; i++) {
    const cur = headers[i];
    if (i === 0) {
      menuItem.push(cur);
    } else {
      for (let j = i - 1; j >= 0; j--) {
        const prev = headers[j];
        if (prev.level < cur.level) {
          (prev.children || (prev.children = [])).push(cur);
          continue outer;
        }
      }
      menuItem.push(cur);
    }
  }

  return menuItem;
}

interface CancellableCallback {
  (): void;
  cancel: () => void;
}

function throttleAndDebounce(
  fn: () => void,
  delay: number
): CancellableCallback {
  let trailingTimeoutId: ReturnType<typeof setTimeout> | undefined;
  let throttleTimeoutId: ReturnType<typeof setTimeout> | undefined;
  let called = false;

  const callback: CancellableCallback = () => {
    if (trailingTimeoutId) {
      clearTimeout(trailingTimeoutId);
      trailingTimeoutId = undefined;
    }

    if (!called) {
      fn();
      called = true;
      throttleTimeoutId = setTimeout(() => {
        called = false;
        throttleTimeoutId = undefined;
      }, delay);
    } else {
      trailingTimeoutId = setTimeout(() => {
        trailingTimeoutId = undefined;
        fn();
      }, delay);
    }
  };

  callback.cancel = () => {
    if (trailingTimeoutId) clearTimeout(trailingTimeoutId);
    if (throttleTimeoutId) clearTimeout(throttleTimeoutId);

    trailingTimeoutId = undefined;
    throttleTimeoutId = undefined;
    called = false;
  };

  return callback;
}

function getScrollOffset(): number {
  const navbar = document.querySelector('nav.toc-navbar');
  const offset = navbar?.getBoundingClientRect().top ?? 0;
  const padding = 8;

  return offset + padding;
}

interface HeaderPosition {
  link: string;
  top: number;
  bottom: number;
}

interface ScrollMetrics {
  scrollY: number;
  innerHeight: number;
  offsetHeight: number;
  scrollOffset: number;
}

export function getActiveHeaderLinks(
  headers: HeaderPosition[],
  { scrollY, innerHeight, offsetHeight, scrollOffset }: ScrollMetrics
): string[] {
  if (!headers.length) return [];

  const viewportBottom = scrollY + innerHeight;
  const activeLinks = new Set<string>();

  for (const { link, top, bottom } of headers) {
    const isVisible = bottom > scrollY && top < viewportBottom;
    if (isVisible) {
      activeLinks.add(link);
    }
  }

  if (scrollY >= 1) {
    const activationLine = scrollY + scrollOffset;
    let carriedLink: string | null = null;

    for (const { link, top } of headers) {
      if (top > activationLine) break;
      carriedLink = link;
    }

    if (carriedLink) {
      activeLinks.add(carriedLink);
    }
  }

  const isBottom = Math.abs(scrollY + innerHeight - offsetHeight) < 1;
  if (isBottom) {
    activeLinks.add(headers[headers.length - 1].link);
  }

  return headers
    .filter(({ link }) => activeLinks.has(link))
    .map(({ link }) => link);
}

function normalizeHash(hash: string): string {
  try {
    return decodeURIComponent(hash);
  } catch {
    return hash;
  }
}

export interface ActiveRailRange {
  topInset: number;
  bottomInset: number;
}

export function updateActiveRailRange(container: HTMLElement): ActiveRailRange {
  const railHeight = container.scrollHeight;
  const containerTop = container.getBoundingClientRect().top;
  const activeLinks = Array.from(
    container.querySelectorAll<HTMLAnchorElement>(
      'a[data-toc-depth][data-active="true"]'
    )
  );

  let topInset = 0;
  let bottomInset = railHeight;

  if (activeLinks.length) {
    const firstRect = activeLinks[0].getBoundingClientRect();
    const lastRect =
      activeLinks[activeLinks.length - 1].getBoundingClientRect();

    topInset = Math.max(
      0,
      Math.min(railHeight, firstRect.top - containerTop + container.scrollTop)
    );
    bottomInset = Math.max(
      0,
      Math.min(
        railHeight,
        railHeight - (lastRect.bottom - containerTop + container.scrollTop)
      )
    );
  }

  container.style.setProperty('--toc-active-top', `${topInset}px`);
  container.style.setProperty('--toc-active-bottom', `${bottomInset}px`);

  return { topInset, bottomInset };
}

export function useActiveAnchor(
  containerRef: RefObject<HTMLElement | null>,
  linkCountOrLegacyMarkerRef: RefObject<HTMLElement | null> | number = 0,
  legacyLinkCount = 0
) {
  const linkCount =
    typeof linkCountOrLegacyMarkerRef === 'number'
      ? linkCountOrLegacyMarkerRef
      : legacyLinkCount;

  useEffect(() => {
    if (!linkCount) return;

    let prevActiveKey: string | undefined;
    let readyRafId: number | null = null;

    function activateLinks(hashes: string[]) {
      const activeKey = hashes.join('\n');
      if (activeKey === prevActiveKey) return;
      prevActiveKey = activeKey;

      const container = containerRef.current;
      if (container) {
        // 캐싱 금지: static NodeList는 React 리렌더링 후 stale 참조를 유발한다
        const links = container.querySelectorAll<HTMLAnchorElement>('a');
        const activeHashes = new Set(hashes.map(normalizeHash));

        links.forEach(link => {
          const href = link.getAttribute('href');
          const isActive =
            href !== null && activeHashes.has(normalizeHash(href));

          link.classList.toggle('!text-foreground', isActive);
          link.dataset.active = String(isActive);
        });

        updateActiveRailRange(container);

        if (container.dataset.tocRailReady !== 'true' && readyRafId === null) {
          readyRafId = requestAnimationFrame(() => {
            if (containerRef.current === container) {
              container.dataset.tocRailReady = 'true';
            }
            readyRafId = null;
          });
        }
      }
    }
    function setActiveLink() {
      const scrollY = window.scrollY;
      const innerHeight = window.innerHeight;
      const offsetHeight = document.body.offsetHeight;

      // resolvedHeaders가 재배치되거나, `hidden` 또는 `fixed` 속성을 가질 수 있으니 예외 처리
      const headers = resolvedHeaders
        .map(({ element, link }) => {
          if (!element.isConnected) return null;

          const rect = element.getBoundingClientRect();
          return {
            link,
            top: rect.top + scrollY,
            bottom: rect.bottom + scrollY,
          };
        })
        .filter(header => header !== null)
        .sort((a, b) => a.top - b.top);

      // 링크를 활성화할 헤더가 없는 경우
      if (!headers.length) {
        activateLinks([]);
        return;
      }

      // getScrollOffset은 querySelector + getBoundingClientRect를 수행하므로 루프 밖에서 1회만 측정
      const scrollOffset = getScrollOffset();
      const activeLinks = getActiveHeaderLinks(headers, {
        scrollY,
        innerHeight,
        offsetHeight,
        scrollOffset,
      });

      activateLinks(activeLinks);
    }

    const onScroll = throttleAndDebounce(setActiveLink, 100);
    const rafId = requestAnimationFrame(setActiveLink);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      onScroll.cancel();
      if (readyRafId !== null) {
        cancelAnimationFrame(readyRafId);
      }
      window.removeEventListener('scroll', onScroll);
    };
  }, [containerRef, linkCount]);
}
