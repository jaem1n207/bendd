import { type RefObject, useEffect } from 'react';

import { querySelectorAll } from '@/lib/dom';
import type { HeadingLevel, LevelRange, MenuItem } from './toc';

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

function throttleAndDebounce(fn: () => void, delay: number): () => void {
  let timeoutId: NodeJS.Timeout;
  let called = false;

  return () => {
    if (timeoutId) clearTimeout(timeoutId);

    if (!called) {
      fn();
      (called = true) && setTimeout(() => (called = false), delay);
    } else timeoutId = setTimeout(fn, delay);
  };
}

function getScrollOffset(): number {
  const navbar = document.querySelector('nav.toc-navbar');
  const offset = navbar?.getBoundingClientRect().top ?? 0;
  const padding = 8;

  return offset + padding;
}

function getAbsoluteTop(element: HTMLElement): number {
  let offsetTop = 0;
  while (element !== document.body) {
    if (element === null) {
      // 자식 요소가 다음과 같은 경우:
      // - DOM에 연결되지 않음 (display: none)
      // - fixed position으로 설정됨 (스크롤 불가능)
      // - body 또는 html 요소 (offsetParent: null)
      return NaN;
    }
    offsetTop += element.offsetTop;
    element = element.offsetParent as HTMLElement;
  }
  return offsetTop;
}

export function useActiveAnchor(
  containerRef: RefObject<HTMLElement>,
  markerRef: RefObject<HTMLElement>
) {
  useEffect(() => {
    function activateLink(hash: string | null) {
      if (containerRef.current) {
        const links = containerRef.current.querySelectorAll('a');
        links.forEach(link => link.classList.remove('bd:!text-foreground'));

        if (hash != null) {
          const activeLink =
            containerRef.current.querySelector<HTMLAnchorElement>(
              `a[href="${decodeURIComponent(hash)}"]`
            );
          if (activeLink) {
            activeLink.classList.add('bd:!text-foreground');
            if (markerRef.current) {
              markerRef.current.style.top = `${activeLink.offsetTop + 4}px`;
              markerRef.current.style.opacity = '1';
            }
          }
        } else if (markerRef.current) {
          markerRef.current.style.top = '-12px';
          markerRef.current.style.opacity = '0';
        }
      }
    }
    function setActiveLink() {
      const scrollY = window.scrollY;
      const innerHeight = window.innerHeight;
      const offsetHeight = document.body.offsetHeight;
      const isBottom = Math.abs(scrollY + innerHeight - offsetHeight) < 1;

      // resolvedHeaders가 재배치되거나, `hidden` 또는 `fixed` 속성을 가질 수 있으니 예외 처리
      const headers = resolvedHeaders
        .map(({ element, link }) => ({
          link,
          top: getAbsoluteTop(element),
        }))
        .filter(({ top }) => !Number.isNaN(top))
        .sort((a, b) => a.top - b.top);

      // 링크를 활성화할 헤더가 없는 경우
      if (!headers.length) {
        activateLink(null);
        return;
      }

      // 페이지 최상단 - 하이라이트 링크 해제
      if (scrollY < 1) {
        activateLink(null);
        return;
      }

      // 페이지 최하단 - 마지막 헤더 활성화
      if (isBottom) {
        activateLink(headers[headers.length - 1].link);
        return;
      }

      // 뷰포트 상단으로부터 마지막 헤더를 찾아 활성화
      let activeLink: string | null = null;
      for (const { link, top } of headers) {
        if (top > scrollY + getScrollOffset()) {
          break;
        }
        activeLink = link;
      }
      activateLink(activeLink);
    }

    const onScroll = throttleAndDebounce(setActiveLink, 100);
    requestAnimationFrame(setActiveLink);
    window.addEventListener('scroll', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [containerRef, markerRef]);
}
