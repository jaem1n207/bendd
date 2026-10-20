import { notFound } from 'next/navigation';

import { ClientTableOfContents } from '@/mdx/common/table-of-contents/client-table-of-contents';

type Scenario = 'demo' | 'worst' | 'empty' | 'one' | 'huge';
type Heading = { id: string; text: string; level: 2 | 3; paragraphs: number };

const SHORT_SECTION_COUNT = 24;
const COMMENT_COUNT = 24;
const HUGE_SECTION_COUNT = 1000;

const SCENARIOS: { key: Scenario; label: string }[] = [
  { key: 'demo', label: 'Demo data' },
  { key: 'worst', label: 'Worst case' },
  { key: 'empty', label: 'Empty' },
  { key: 'one', label: 'One' },
  { key: 'huge', label: '1,000 rows' },
];

const DEMO: Heading[] = [
  { id: 'intro', text: '소개', level: 2, paragraphs: 4 },
  { id: 'design', text: '디자인', level: 2, paragraphs: 5 },
  { id: 'details', text: '구현 상세', level: 3, paragraphs: 3 },
  { id: 'outcome', text: '결과', level: 2, paragraphs: 5 },
];

const WORST: Heading[] = [
  {
    id: 'long-ko',
    text: '모바일과 데스크톱의 내비게이션 상태를 서로 동기화하면서 스크롤 복원도 처리하는 방법',
    level: 2,
    paragraphs: 2,
  },
  {
    id: 'url',
    text: 'https://example.com/workspaces/acme/projects/q3-launch/docs/9f8e7d6c5b4a?tab=comments&filter=unresolved',
    level: 3,
    paragraphs: 1,
  },
  { id: 'short', text: 'J', level: 3, paragraphs: 1 },
  {
    id: 'german',
    text: 'Benachrichtigungseinstellungen',
    level: 2,
    paragraphs: 1,
  },
  { id: 'empty-heading', text: '', level: 3, paragraphs: 1 },
  {
    id: 'vietnamese',
    text: 'Đặng Thị Ngọc Hân: giao diện và khả năng tiếp cận',
    level: 3,
    paragraphs: 1,
  },
  {
    id: 'emoji',
    text: '👩🏽‍💻 Priya가 만든 API 변경 기록',
    level: 3,
    paragraphs: 1,
  },
  {
    id: 'arabic',
    text: 'نور الهدى عبد الرحمن — تفاصيل التنفيذ',
    level: 2,
    paragraphs: 1,
  },
  { id: 'identical-a', text: '성능 개선', level: 3, paragraphs: 1 },
  { id: 'identical-b', text: '성능 개선', level: 3, paragraphs: 1 },
  { id: 'tall', text: '오래 읽는 구간', level: 2, paragraphs: 22 },
  ...Array.from(
    { length: SHORT_SECTION_COUNT },
    (_, index): Heading => ({
      id: `short-section-${index + 1}`,
      text: `짧은 하위 구간 ${index + 1}`,
      level: 3,
      paragraphs: 1,
    })
  ),
];

const HUGE: Heading[] = Array.from(
  { length: HUGE_SECTION_COUNT },
  (_, index): Heading => ({
    id: `large-section-${index + 1}`,
    text: `참고 항목 ${index + 1}`,
    level: index % 5 === 0 ? 2 : 3,
    paragraphs: 1,
  })
);

const PARAGRAPH =
  '실제 글의 본문처럼 이 구간에 충분한 문장을 넣어 스크롤 높이와 읽기 진행 상태를 확인합니다. 목차 항목의 높이는 문서에서 해당 구간이 차지하는 비율에 따라 정해집니다.';

function headingsFor(scenario: Scenario): Heading[] {
  if (scenario === 'worst') {
    return WORST;
  }
  if (scenario === 'empty') {
    return [];
  }
  if (scenario === 'one') {
    return [DEMO[0]];
  }
  if (scenario === 'huge') {
    return HUGE;
  }
  return DEMO;
}

export default async function TocBreakPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  const { data } = await searchParams;
  const scenario = SCENARIOS.find(item => item.key === data)?.key ?? 'demo';
  const headings = headingsFor(scenario);
  const title =
    scenario === 'worst'
      ? '모바일과 데스크톱에서 읽기 진행과 목차 링크를 함께 동기화하는 방법?'
      : '목차 데이터 검증';

  return (
    <main style={{ maxWidth: 672, margin: '0 auto', padding: '128px 24px' }}>
      <section id="BenddDoc">
        <ClientTableOfContents title={title} />
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>{title}</h1>
        <p>{PARAGRAPH}</p>
        <article style={{ marginTop: 80 }}>
          {headings.map(heading => (
            <section key={heading.id}>
              {heading.level === 2 ? (
                <h2
                  id={heading.id}
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: 700,
                    marginTop: 48,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {heading.text}
                </h2>
              ) : (
                <h3
                  id={heading.id}
                  style={{
                    fontSize: '1.375rem',
                    fontWeight: 650,
                    marginTop: 36,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {heading.text}
                </h3>
              )}
              {Array.from({ length: heading.paragraphs }, (_, index) => (
                <p key={index} style={{ marginTop: 20, lineHeight: 1.8 }}>
                  {PARAGRAPH}
                </p>
              ))}
            </section>
          ))}
        </article>
        {scenario === 'worst' && (
          <section aria-label="댓글" style={{ marginTop: 120 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              댓글 {COMMENT_COUNT}개
            </h2>
            {Array.from({ length: COMMENT_COUNT }, (_, index) => (
              <p key={index} style={{ marginTop: 20, lineHeight: 1.8 }}>
                {PARAGRAPH}
              </p>
            ))}
          </section>
        )}
      </section>
      <nav
        aria-label="Test data"
        style={{
          position: 'fixed',
          zIndex: 100,
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          width: 'max-content',
          maxWidth: 'calc(100vw - 16px)',
          overflowX: 'auto',
          boxSizing: 'border-box',
          gap: 4,
          padding: 4,
          borderRadius: 12,
          background: 'hsl(var(--muted))',
          color: 'hsl(var(--foreground))',
          fontFamily: 'system-ui',
          fontSize: '0.75rem',
          whiteSpace: 'nowrap',
        }}
      >
        {SCENARIOS.map(item => (
          <a
            key={item.key}
            href={`?data=${item.key}`}
            aria-current={scenario === item.key ? 'page' : undefined}
            style={{
              padding: '8px 10px',
              flexShrink: 0,
              borderRadius: 9,
              background:
                scenario === item.key
                  ? 'hsl(var(--background))'
                  : 'transparent',
              boxShadow:
                scenario === item.key
                  ? '0 1px 3px hsl(var(--foreground) / 0.12)'
                  : undefined,
            }}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </main>
  );
}
