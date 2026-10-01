interface TechStackItem {
  id: string;
  name: string;
  image?: string;
  monochrome?: boolean;
  darkContrast?: boolean;
}

interface TechStackGroup {
  id: string;
  name: string;
  description: string;
  items: readonly TechStackItem[];
}

export const techStackGroups: readonly TechStackGroup[] = [
  {
    id: 'web-interface',
    name: 'Web & Interface',
    description: '화면의 구조와 스타일',
    items: [
      { id: 'typescript', name: 'TypeScript' },
      { id: 'react', name: 'React' },
      { id: 'nextjs', name: 'Next.js', monochrome: true },
      { id: 'svelte', name: 'Svelte' },
      { id: 'tailwindcss', name: 'Tailwind CSS' },
      { id: 'emotion', name: 'Emotion', image: 'emotion.png' },
      { id: 'radixui', name: 'Radix UI', monochrome: true },
    ],
  },
  {
    id: 'design-motion',
    name: 'Design & Motion',
    description: '시각 설계와 인터랙션',
    items: [
      { id: 'figma', name: 'Figma' },
      { id: 'zeplin', name: 'Zeplin' },
      { id: 'motion', name: 'Motion' },
      { id: 'gsap', name: 'GSAP' },
    ],
  },
  {
    id: 'data-backend',
    name: 'Data & Backend',
    description: 'API, 실행 환경, 데이터 저장',
    items: [
      { id: 'nodejs', name: 'Node.js' },
      { id: 'bun', name: 'Bun' },
      { id: 'python', name: 'Python' },
      { id: 'hono', name: 'Hono' },
      { id: 'graphql', name: 'GraphQL' },
      { id: 'apollo-client', name: 'Apollo Client', darkContrast: true },
      { id: 'drizzle', name: 'Drizzle' },
      { id: 'postgresql', name: 'PostgreSQL' },
      { id: 'mongodb', name: 'MongoDB' },
      { id: 'duckdb', name: 'DuckDB' },
    ],
  },
  {
    id: 'state-validation',
    name: 'State & Validation',
    description: '상태 관리와 데이터 검증',
    items: [
      { id: 'tanstack', name: 'TanStack', monochrome: true },
      { id: 'zustand', name: 'Zustand' },
      { id: 'zod', name: 'Zod' },
      { id: 'arktype', name: 'ArkType' },
    ],
  },
  {
    id: 'testing-ui-review',
    name: 'Testing & UI Review',
    description: '동작 검증과 컴포넌트 리뷰',
    items: [
      { id: 'vitest', name: 'Vitest' },
      { id: 'playwright', name: 'Playwright' },
      { id: 'msw', name: 'MSW' },
      { id: 'storybook', name: 'Storybook' },
      { id: 'chromatic', name: 'Chromatic' },
    ],
  },
  {
    id: 'build-monorepo',
    name: 'Build & Monorepo',
    description: '빌드와 패키지 구성',
    items: [
      { id: 'vite', name: 'Vite' },
      { id: 'esbuild', name: 'esbuild' },
      { id: 'webpack', name: 'webpack' },
      { id: 'swc', name: 'SWC' },
      { id: 'babel', name: 'Babel' },
      { id: 'turborepo', name: 'Turborepo' },
      { id: 'lerna', name: 'Lerna' },
      { id: 'nx', name: 'Nx', darkContrast: true },
    ],
  },
  {
    id: 'delivery-monitoring',
    name: 'Delivery & Monitoring',
    description: '변경 이력, 배포, 서비스 관측',
    items: [
      { id: 'git', name: 'Git' },
      { id: 'github-actions', name: 'GitHub Actions' },
      { id: 'vercel', name: 'Vercel', monochrome: true },
      { id: 'argocd', name: 'Argo CD' },
      { id: 'sentry', name: 'Sentry', darkContrast: true },
      { id: 'umami', name: 'Umami', monochrome: true },
      { id: 'datadog', name: 'Datadog' },
    ],
  },
  {
    id: 'workflow-ai',
    name: 'Workflow & AI',
    description: '탐색, 사고, 구현을 돕는 도구',
    items: [
      { id: 'chatgpt', name: 'ChatGPT', monochrome: true },
      { id: 'claude', name: 'Claude' },
      { id: 'cursor', name: 'Cursor', monochrome: true },
      { id: 'gemini', name: 'Gemini' },
      { id: 'grok', name: 'Grok', monochrome: true },
    ],
  },
  {
    id: 'collaboration',
    name: 'Collaboration',
    description: '기록과 팀 커뮤니케이션',
    items: [
      { id: 'slack', name: 'Slack' },
      { id: 'jira', name: 'Jira' },
      { id: 'confluence', name: 'Confluence' },
      { id: 'notion', name: 'Notion', monochrome: true },
      { id: 'obsidian', name: 'Obsidian' },
    ],
  },
];
