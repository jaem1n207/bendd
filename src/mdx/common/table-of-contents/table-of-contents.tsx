'use client';

import { useEffect, useState } from 'react';

import styles from '@/mdx/common/table-of-contents/table-of-contents.module.css';

const DOCUMENT_ID = 'BenddDoc';
const HEADING_SELECTOR = 'h2[id]';
const READING_OFFSET_PX = 112;
const READING_VIEWPORT_RATIO = 0.2;
const PERCENT = 100;

type Section = {
  id: string;
  title: string;
  top: number;
  height: number;
  progress: number;
};

function measureSections(title: string): Section[] {
  const doc = document.getElementById(DOCUMENT_ID);
  const article = doc?.querySelector('article');
  if (!doc || !article) {
    return [];
  }

  const scrollY = window.scrollY;
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
      position: heading.getBoundingClientRect().top + scrollY,
    }))
    .filter(heading => heading.position > start && heading.position < end)
    .sort((a, b) => a.position - b.position);
  const boundaries = [
    { id: DOCUMENT_ID, title, position: start },
    ...headings,
    { id: '', title: '', position: end },
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
      top: ((section.position - start) / total) * PERCENT,
      height: ((next - section.position) / total) * PERCENT,
      progress: Math.min(
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
        >
          <span className={styles.label}>{section.title}</span>
          <span className={styles.track} aria-hidden="true">
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
