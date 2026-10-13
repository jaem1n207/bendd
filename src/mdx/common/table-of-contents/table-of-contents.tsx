'use client';

import { type PointerEvent, useEffect, useState } from 'react';

import styles from '@/mdx/common/table-of-contents/table-of-contents.module.css';

const DOCUMENT_ID = 'BenddDoc';
const HEADING_SELECTOR = 'h2[id], h3[id]';
const READING_OFFSET_PX = 112;
const READING_VIEWPORT_RATIO = 0.2;
const RAIL_VIEWPORT_RATIO = 0.72;
const MIN_LINK_HEIGHT_PX = 4;
const MIN_GROUP_HEIGHT_PX = 12;
const PERCENT = 100;
const BOTTOM_TOLERANCE_PX = 1;

type Section = {
  id: string;
  title: string;
  depth: number;
  top: number;
  height: number;
  progress: number;
  count: number;
};

type ArticleBounds = {
  article: HTMLElement;
  start: number;
  end: number;
};

function getMaxScrollY() {
  const scrollHeight =
    document.scrollingElement?.scrollHeight ??
    document.documentElement.scrollHeight;
  return Math.max(0, scrollHeight - window.innerHeight);
}

function getReadingOffset() {
  return Math.min(
    READING_OFFSET_PX,
    window.innerHeight * READING_VIEWPORT_RATIO
  );
}

function getArticleBounds(): ArticleBounds | null {
  const doc = document.getElementById(DOCUMENT_ID);
  const article = doc?.querySelector<HTMLElement>('article');
  if (!doc || !article) {
    return null;
  }

  const scrollY = window.scrollY;
  const start = doc.getBoundingClientRect().top + scrollY;
  const end = Math.max(
    article.getBoundingClientRect().bottom + scrollY,
    start + 1
  );
  return { article, start, end };
}

function scrollFromRail(event: PointerEvent<HTMLSpanElement>) {
  const nav = event.currentTarget.closest('nav');
  const bounds = getArticleBounds();
  if (!nav || !bounds) {
    return;
  }

  const { top, height } = nav.getBoundingClientRect();
  if (height <= 0) {
    return;
  }

  const fraction = Math.min(1, Math.max(0, (event.clientY - top) / height));
  const readingPosition = bounds.start + fraction * (bounds.end - bounds.start);
  const scrollY = Math.min(
    getMaxScrollY(),
    Math.max(0, readingPosition - getReadingOffset())
  );
  window.scrollTo(0, scrollY);
}

function handleRailPointerDown(event: PointerEvent<HTMLSpanElement>) {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  event.currentTarget.setPointerCapture(event.pointerId);
  scrollFromRail(event);
}

function handleRailPointerMove(event: PointerEvent<HTMLSpanElement>) {
  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    scrollFromRail(event);
  }
}

function handleRailPointerEnd(event: PointerEvent<HTMLSpanElement>) {
  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
}

function measureSections(title: string): Section[] {
  const bounds = getArticleBounds();
  if (!bounds) {
    return [];
  }

  const { article, start, end } = bounds;
  const scrollY = window.scrollY;
  const atBottom = scrollY >= getMaxScrollY() - BOTTOM_TOLERANCE_PX;
  const headings = Array.from(
    article.querySelectorAll<HTMLHeadingElement>(HEADING_SELECTOR)
  )
    .filter(heading => heading.getClientRects().length > 0)
    .map(heading => ({
      id: heading.id,
      title: heading.textContent?.trim() || heading.id,
      depth: heading.tagName === 'H3' ? 1 : 0,
      position: heading.getBoundingClientRect().top + scrollY,
    }))
    .filter(heading => heading.position > start && heading.position < end)
    .sort((a, b) => a.position - b.position);

  if (headings.length === 0) {
    return [];
  }

  const boundaries = [
    { id: DOCUMENT_ID, title, depth: 0, position: start },
    ...headings,
    { id: '', title: '', depth: 0, position: end },
  ];
  const readingPosition = scrollY + getReadingOffset();
  const total = end - start;

  return boundaries.slice(0, -1).map((section, index) => {
    const next = boundaries[index + 1].position;
    const length = Math.max(next - section.position, 1);
    return {
      id: section.id,
      title: section.title,
      depth: section.depth,
      top: ((section.position - start) / total) * PERCENT,
      height: ((next - section.position) / total) * PERCENT,
      progress: atBottom
        ? 1
        : Math.min(
            1,
            Math.max(0, (readingPosition - section.position) / length)
          ),
      count: 1,
    };
  });
}

function mergeSections(sections: Section[]): Section {
  const first = sections[0];
  const height = sections.reduce((sum, section) => sum + section.height, 0);
  const consumed = sections.reduce(
    (sum, section) => sum + section.height * section.progress,
    0
  );
  return {
    ...first,
    title:
      sections.length === 1
        ? first.title
        : `${first.title} 외 ${sections.length - 1}개 구간`,
    height,
    progress: height > 0 ? consumed / height : 0,
    count: sections.length,
  };
}

function groupSections(sections: Section[]): Section[] {
  const railHeight = Math.max(window.innerHeight * RAIL_VIEWPORT_RATIO, 1);
  const linkHeight = (MIN_LINK_HEIGHT_PX / railHeight) * PERCENT;
  if (sections.every(section => section.height >= linkHeight)) {
    return sections;
  }

  const groupHeight = (MIN_GROUP_HEIGHT_PX / railHeight) * PERCENT;
  const grouped: Section[] = [];
  let groupStart = 0;

  for (let index = 1; index < sections.length; index++) {
    const distance = sections[index].top - sections[groupStart].top;
    const remaining = PERCENT - sections[index].top;
    if (distance < groupHeight || remaining < groupHeight) {
      continue;
    }

    grouped.push(mergeSections(sections.slice(groupStart, index)));
    groupStart = index;
  }

  grouped.push(mergeSections(sections.slice(groupStart)));
  return grouped;
}

function getActiveIndex(sections: Section[]) {
  let activeIndex = 0;
  sections.forEach((section, index) => {
    if (section.progress > 0) {
      activeIndex = index;
    }
  });
  return activeIndex;
}

export function TableOfContents({ title }: { title: string }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [isFullListOpen, setIsFullListOpen] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setSections(measureSections(title));
    };
    const schedule = () => {
      if (!frame) {
        frame = requestAnimationFrame(update);
      }
    };

    const article = document
      .getElementById(DOCUMENT_ID)
      ?.querySelector('article');
    const observer = article ? new ResizeObserver(schedule) : null;
    if (article && observer) {
      observer.observe(article);
    }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();

    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      observer?.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [title]);

  if (sections.length === 0) {
    return null;
  }

  const railSections = groupSections(sections);
  const isDense = railSections.length < sections.length;
  const activeRailIndex = getActiveIndex(railSections);
  const activeSectionIndex = getActiveIndex(sections);

  return (
    <nav className={styles.nav} aria-label="글 목차">
      {isDense && (
        <button
          type="button"
          className={styles.fullListToggle}
          aria-expanded={isFullListOpen}
          aria-controls={isFullListOpen ? 'toc-full-list' : undefined}
          onClick={() => setIsFullListOpen(open => !open)}
        >
          {isFullListOpen ? '목차 닫기' : `전체 목차 (${sections.length})`}
        </button>
      )}
      {isDense && isFullListOpen && (
        <div
          id="toc-full-list"
          className={styles.fullList}
          role="region"
          aria-label="전체 목차"
          data-toc-full-list=""
        >
          {sections.map((section, index) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              data-depth={section.depth}
              aria-current={
                index === activeSectionIndex ? 'location' : undefined
              }
              onClick={() => setIsFullListOpen(false)}
            >
              {section.title}
            </a>
          ))}
        </div>
      )}
      {railSections.map((section, index) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className={styles.section}
          style={{ top: `${section.top}%`, height: `${section.height}%` }}
          aria-label={section.title}
          aria-current={index === activeRailIndex ? 'location' : undefined}
          data-passed={section.progress === 1}
          data-depth={section.depth}
          data-group-size={section.count}
          data-toc-rail-link=""
        >
          <span className={styles.label}>{section.title}</span>
          <span
            className={styles.track}
            aria-hidden="true"
            onPointerDown={handleRailPointerDown}
            onPointerMove={handleRailPointerMove}
            onPointerUp={handleRailPointerEnd}
            onPointerCancel={handleRailPointerEnd}
            onClick={event => event.preventDefault()}
          >
            <span
              className={styles.fill}
              style={{ height: `${section.progress * PERCENT}%` }}
            />
          </span>
        </a>
      ))}
    </nav>
  );
}
