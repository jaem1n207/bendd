import type { Article, SeriesInfo } from '@/mdx/mdx';

import { absoluteUrl, blogId, websiteId } from '@/lib/structured-data/ids';
import {
  type HomeProject,
  createBlogNode,
  createBlogPostingNode,
  createBreadcrumbNode,
  createCollectionPageNode,
  createGraph,
  createItemListNode,
  createPersonNode,
  createProfilePageNode,
  createSeriesItemListNode,
  createSoftwareApplicationNode,
  createWebPageNode,
  createWebsiteNode,
  reference,
} from '@/lib/structured-data/nodes';

export const createHomeGraph = ({ project }: { project: HomeProject }) =>
  createGraph([
    createWebsiteNode(),
    createPersonNode(),
    createProfilePageNode(),
    createSoftwareApplicationNode({ project }),
  ]);

export const createArticleIndexGraph = ({
  articles,
}: {
  articles: ReadonlyArray<Article>;
}) => {
  const itemList = createItemListNode({
    entries: articles.map((article, index) => ({
      position: index + 1,
      url: absoluteUrl(`/article/${article.slug}`),
      name: article.metadata.title,
    })),
  });

  return createGraph([
    createWebsiteNode({ slim: true }),
    createPersonNode(),
    createBreadcrumbNode({
      path: '/article',
      items: [
        { name: '홈', path: '/' },
        { name: '기술 이야기', path: '/article' },
      ],
    }),
    createCollectionPageNode({
      path: '/article',
      name: '기술 이야기',
      description: '경험과 지식을 공유하는 공간입니다.',
      breadcrumbPath: '/article',
      mainEntity: itemList,
    }),
    createBlogNode(),
  ]);
};

export const createCraftIndexGraph = ({
  articles,
}: {
  articles: ReadonlyArray<Article>;
}) => {
  const itemList = createItemListNode({
    entries: articles.map((article, index) => ({
      position: index + 1,
      url: absoluteUrl(`/craft/${article.slug}`),
      name: article.metadata.title,
    })),
  });

  return createGraph([
    createWebsiteNode({ slim: true }),
    createPersonNode(),
    createBreadcrumbNode({
      path: '/craft',
      items: [
        { name: '홈', path: '/' },
        { name: '작업 목록', path: '/craft' },
      ],
    }),
    createCollectionPageNode({
      path: '/craft',
      name: '작업 목록',
      description: '작업한 결과물을 모아놓은 공간입니다.',
      breadcrumbPath: '/craft',
      mainEntity: itemList,
    }),
  ]);
};

export const createArticleDetailGraph = ({ post }: { post: Article }) => {
  const path = `/article/${post.slug}`;

  return createGraph([
    createWebsiteNode({ slim: true }),
    createPersonNode(),
    createBlogNode(),
    createBreadcrumbNode({
      path,
      items: [
        { name: '홈', path: '/' },
        { name: '기술 이야기', path: '/article' },
        { name: post.metadata.title, path },
      ],
    }),
    createWebPageNode({
      path,
      name: post.metadata.title,
      description: post.metadata.description,
    }),
    createBlogPostingNode({
      post,
      path,
      partOf: reference(blogId()),
    }),
  ]);
};

export const createCraftDetailGraph = ({ post }: { post: Article }) => {
  const path = `/craft/${post.slug}`;

  return createGraph([
    createWebsiteNode({ slim: true }),
    createPersonNode(),
    createBreadcrumbNode({
      path,
      items: [
        { name: '홈', path: '/' },
        { name: '작업 목록', path: '/craft' },
        { name: post.metadata.title, path },
      ],
    }),
    createWebPageNode({
      path,
      name: post.metadata.title,
      description: post.metadata.description,
    }),
    createBlogPostingNode({
      post,
      path,
      partOf: reference(websiteId()),
    }),
  ]);
};

export const createSeriesGraph = ({
  seriesInfo,
}: {
  seriesInfo: SeriesInfo;
}) => {
  const path = `/article/series/${seriesInfo.id}`;
  const itemList = createSeriesItemListNode({ seriesInfo });

  return createGraph([
    createWebsiteNode({ slim: true }),
    createPersonNode(),
    createBreadcrumbNode({
      path,
      items: [
        { name: '홈', path: '/' },
        { name: '기술 이야기', path: '/article' },
        { name: `${seriesInfo.name} 시리즈`, path },
      ],
    }),
    createCollectionPageNode({
      path,
      name: `${seriesInfo.name} 시리즈`,
      description: seriesInfo.description,
      breadcrumbPath: path,
      mainEntity: itemList,
    }),
  ]);
};
