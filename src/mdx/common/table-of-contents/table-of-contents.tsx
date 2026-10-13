'use client';

import { type PointerEvent, useEffect, useState } from 'react';

import styles from '@/mdx/common/table-of-contents/table-of-contents.module.css';

const DOCUMENT_ID = 'BenddDoc';
const HEADING_SELECTOR = 'h2[id], h3[id]';
const READING_OFFSET_PX = 112;
const READING_VIEWPORT_RATIO = 0.2;
const PERCENT = 100;
const BOTTOM_TOLERANCE_PX = 1;

type Section = {
  id: string;
  title: string;
  depth: number;
  top: number;
  height: number;
  progress: number;
};

function getMaxScrollY() {
  const scrollHeight =
    document.scrollingElement?.scrollHeight ??
    document.documentElement.scrollHeight;
  return Math.max(0, scrollHeight - window.innerHeight);
}

function scrollFromRail(event: PointerEvent<HTMLSpanElement>) {
  const nav = event.currentTarget.closest('nav');
  if (!nav) {
    return;
  }

  const { top, height } = nav.getBoundingClientRect();
  if (height <= 0) {
    return;
  }

  const fraction = Math.min(1, Math.max(0, (event.clientY - top) / height));
  window.scrollTo(0, fraction * getMaxScrollY());
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
  const doc = document.getElementById(DOCUMENT_ID);
  const article = doc?.querySelector('article');
  if (!doc || !article) {
    return [];
  }

  const scrollY = window.scrollY;
  const atBottom = scrollY >= getMaxScrollY() - BOTTOM_TOLERANCE_PX;
  const start = doc.getBoundingClientRect().top + scrollY;
  const end = Math.max(
    article.getBoundingClientRect().bottom + scrollY,
    start + 1
  );
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
  const boundaries = [
    { id: DOCUMENT_ID, title, depth: 0, position: start },
    ...headings,
    { id: '', title: '', depth: 0, position: end },
  ];
  const readingPosition =
    scrollY +
    Math.min(READING_OFFSET_PX, window.innerHeight * READING_VIEWPORT_RATIO);
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
    };
  });
}

export function TableOfContents({ title }: { title: string }) {
  const [sections, setSections] = useState<Section[]>([]);

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

    const article = document.querySelector('#BenddDoc article');
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

  let activeIndex = 0;
  sections.forEach((section, index) => {
    if (section.progress > 0) {
      activeIndex = index;
    }
  });

  return (
    <nav className={styles.nav} aria-label="글 목차">
      {sections.map((section, index) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className={styles.section}
          style={{ top: `${section.top}%`, height: `${section.height}%` }}
          aria-label={section.title}
          aria-current={index === activeIndex ? 'location' : undefined}
          data-passed={section.progress === 1}
          data-depth={section.depth}
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
