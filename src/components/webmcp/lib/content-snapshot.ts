import type { WebMCPToolName } from '@/components/webmcp/lib/schemas';

type ContentType = 'article' | 'craft';
type SeriesTarget = 'series' | 'previous' | 'next';

type HeadingSnapshot = {
  id: string;
  title: string;
  level: 2 | 3 | 4;
};

type SnapshotFailure = {
  ok: false;
  error: string;
};

const contentSelector = '[data-webmcp-content]';
const codeBlockSelector = 'pre[data-webmcp-code-block]';
const headingSelector = 'article h2[id], article h3[id], article h4[id]';
const shuffleLettersPathname = '/playground/shuffle-letters';

const baseActions: WebMCPToolName[] = [
  'navigate_site',
  'get_site_context',
  'toggle_theme',
  'set_sound',
  'copy_current_url',
  'find_content',
  'open_content',
  'list_page_actions',
];

function cleanText(value: string | null | undefined) {
  return value?.replace(/\s+/g, ' ').trim() ?? '';
}

function getDocument(docLike: Document | undefined) {
  return docLike ?? document;
}

function getContentRoot(doc: Document) {
  return doc.querySelector<HTMLElement>(contentSelector);
}

function isShuffleLettersPathname(pathname: string) {
  return (
    pathname === shuffleLettersPathname ||
    pathname === `${shuffleLettersPathname}/`
  );
}

export function getCurrentContentContext(docLike?: Document) {
  const doc = getDocument(docLike);
  const root = getContentRoot(doc);

  if (!root) {
    return {
      ok: false,
      error: '현재 페이지에는 WebMCP 콘텐츠 컨텍스트가 없습니다.',
    } satisfies SnapshotFailure;
  }

  const article = root.querySelector('article');
  const headings = [...root.querySelectorAll<HTMLElement>(headingSelector)]
    .map(heading => ({
      id: heading.id,
      title: cleanText(heading.textContent),
      level: Number(heading.tagName.slice(1)) as 2 | 3 | 4,
    }))
    .filter((heading): heading is HeadingSnapshot =>
      Boolean(heading.id && heading.title)
    );
  const excerpt = cleanText(article?.querySelector('p')?.textContent).slice(
    0,
    300
  );
  const seriesId = root.dataset.webmcpSeriesId;
  const seriesName = root.dataset.webmcpSeriesName;

  return {
    ok: true,
    type: root.dataset.webmcpContentType as ContentType,
    slug: root.dataset.webmcpSlug ?? '',
    title: root.dataset.webmcpTitle ?? '',
    publishedAt: root.dataset.webmcpPublishedAt ?? '',
    description: root.dataset.webmcpDescription ?? '',
    summary: root.dataset.webmcpSummary ?? '',
    ...(seriesId &&
      seriesName && {
        series: {
          id: seriesId,
          name: seriesName,
        },
      }),
    tldr: cleanText(root.querySelector('blockquote')?.textContent),
    excerpt,
    headings,
  };
}

export function getCodeBlockText(index: number, docLike?: Document) {
  const doc = getDocument(docLike);
  const block = [...doc.querySelectorAll<HTMLElement>(codeBlockSelector)][
    index
  ];
  const code = block?.querySelector('code');
  const text = code?.textContent?.trim() ?? '';

  if (!block || !text) {
    return {
      ok: false,
      error: `${index}번 코드 블록을 찾지 못했습니다.`,
    } satisfies SnapshotFailure;
  }

  const languageClass = [...(code?.classList ?? [])].find(className =>
    className.startsWith('language-')
  );

  return {
    ok: true,
    language: languageClass?.replace('language-', '') ?? '',
    text,
    characterCount: text.length,
  };
}

export function jumpToHeading(headingId: string, docLike?: Document) {
  const doc = getDocument(docLike);
  const root = getContentRoot(doc);
  const heading = [
    ...(root?.querySelectorAll<HTMLElement>(headingSelector) ?? []),
  ].find(candidate => candidate.id === headingId);

  if (!heading) {
    return {
      ok: false,
      error: `${headingId} heading을 찾지 못했습니다.`,
    } satisfies SnapshotFailure;
  }

  heading.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return {
    ok: true,
    headingId,
    title: cleanText(heading.textContent),
  };
}

export function getSeriesTargetHref(target: SeriesTarget, docLike?: Document) {
  const doc = getDocument(docLike);
  const link = doc.querySelector<HTMLAnchorElement>(
    `[data-webmcp-series-target="${target}"]`
  );

  if (!link) {
    return {
      ok: false,
      error: `${target} 시리즈 이동 링크를 찾지 못했습니다.`,
    } satisfies SnapshotFailure;
  }

  return {
    ok: true,
    href: link.getAttribute('href') ?? '',
  };
}

export function getPageActions(pathname: string, docLike?: Document) {
  const doc = getDocument(docLike);
  const actions = new Set<WebMCPToolName>(baseActions);

  if (getContentRoot(doc)) {
    actions.add('get_current_content_context');
    actions.add('jump_to_heading');
  }

  if (doc.querySelector(codeBlockSelector)) {
    actions.add('copy_code_block');
  }

  if (doc.querySelector('[data-webmcp-series-target]')) {
    actions.add('open_series');
  }

  if (isShuffleLettersPathname(pathname)) {
    actions.add('run_shuffle_letters');
    actions.add('stop_shuffle_letters');
  }

  return [...actions];
}
