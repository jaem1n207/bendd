import type { Metadata } from 'next';

import { JsonLdScript } from '@/components/structured-data';
import { HomeStudio } from '@/components/home';
import { readArticles } from '@/mdx/mdx';
import { createHomeGraph } from '@/lib/structured-data';
import { siteMetadata } from '@/lib/site-metadata';

export const metadata: Metadata = {
  title: {
    absolute: `${siteMetadata.author} - 소프트웨어 엔지니어`,
  },
  description:
    '작업하며 마주한 문제와 해결 과정을 정리해 공유합니다. 이 글이 누군가에게 도움이 되길 바랍니다.',
  alternates: {
    canonical: siteMetadata.siteUrl,
  },
};

const synchronizeTabScrollingProject = {
  slug: 'synchronize-tab-scrolling',
  name: 'Synchronize Tab Scrolling',
  description:
    '여러 탭의 스크롤을 실시간으로 동기화하는 오픈소스 브라우저 확장 프로그램입니다.',
  url: 'https://chromewebstore.google.com/detail/synchronize-tab-scrolling/phceoocamipnafpgnchbfhkdlbleeafc',
  sameAs: 'https://github.com/jaem1n207/synchronize-tab-scrolling',
} as const;

const homeJsonLd = createHomeGraph({
  project: synchronizeTabScrollingProject,
});

const featuredArticleSlugs = [
  'save-tokens-for-ai-agent',
  'immediate-motion-component',
  'naming-tokens-in-design',
];

export default function Home() {
  const articles = readArticles();
  const featuredArticles = featuredArticleSlugs.flatMap(slug => {
    const article = articles.find(candidate => candidate.slug === slug);
    return article ? [{ slug: article.slug, metadata: article.metadata }] : [];
  });

  return (
    <>
      <JsonLdScript data={homeJsonLd} />
      <HomeStudio articles={featuredArticles} />
    </>
  );
}
