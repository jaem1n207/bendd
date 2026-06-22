import type {
  Blog,
  BlogPosting,
  BreadcrumbList,
  CollectionPage,
  Graph,
  ImageObject,
  ItemList,
  ListItem,
  Person,
  ProfilePage,
  SoftwareApplication,
  Thing,
  WebPage,
  WebSite,
} from 'schema-dts';

import { siteMetadata } from '@/lib/site-metadata';
import type { Article, SeriesInfo } from '@/mdx/mdx';

import {
  absoluteUrl,
  blogId,
  blogPostingId,
  breadcrumbId,
  personId,
  softwareApplicationId,
  webpageId,
  websiteId,
} from '@/lib/structured-data/ids';

type SchemaReference = { '@id': string };

export type HomeProject = {
  slug: string;
  name: string;
  description: string;
  url: string;
  sameAs: string;
};

const isAbsoluteUrl = (value: string) => /^https?:\/\//.test(value);

const absoluteImageUrl = (image: string): string =>
  isAbsoluteUrl(image) ? image : absoluteUrl(image);

export const reference = (id: string): SchemaReference => ({ '@id': id });

export const createGraph = (nodes: readonly Thing[]): Graph => ({
  '@context': 'https://schema.org',
  '@graph': nodes,
});

export const createWebsiteNode = ({
  slim = false,
}: {
  slim?: boolean;
} = {}): WebSite => ({
  '@type': 'WebSite',
  '@id': websiteId(),
  url: absoluteUrl(),
  name: `${siteMetadata.author} - 소프트웨어 엔지니어`,
  ...(slim
    ? {}
    : {
        alternateName: [siteMetadata.title, 'bendd.me'],
        description: siteMetadata.description,
        inLanguage: siteMetadata.language,
        publisher: reference(personId()),
      }),
});

export const createPersonNode = (): Person => ({
  '@type': 'Person',
  '@id': personId(),
  url: absoluteUrl(),
  name: siteMetadata.author,
  alternateName: 'jaem1n207',
  jobTitle: '소프트웨어 엔지니어',
  description: '해야 하는 일 속에서 하고 싶은 의미를 찾는 소프트웨어 엔지니어',
  knowsLanguage: siteMetadata.language,
  sameAs: [siteMetadata.github, siteMetadata.youtube],
});

export const createBreadcrumbNode = ({
  path,
  items,
}: {
  path: string;
  items: ReadonlyArray<{ name: string; path: string }>;
}): BreadcrumbList => ({
  '@type': 'BreadcrumbList',
  '@id': breadcrumbId(path),
  itemListElement: items.map<ListItem>((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
});

export const createProfilePageNode = (): ProfilePage => ({
  '@type': 'ProfilePage',
  '@id': webpageId('/'),
  url: absoluteUrl(),
  name: `${siteMetadata.author} - 소프트웨어 엔지니어`,
  description:
    '작업하며 마주한 문제와 해결 과정을 정리해 공유합니다. 이 글이 누군가에게 도움이 되길 바랍니다.',
  inLanguage: siteMetadata.language,
  isPartOf: reference(websiteId()),
  mainEntity: reference(personId()),
});

export const createBlogNode = (): Blog => ({
  '@type': 'Blog',
  '@id': blogId(),
  name: `${siteMetadata.author}의 기술 이야기`,
  description: '경험과 지식을 공유하는 공간입니다.',
  inLanguage: siteMetadata.language,
  isPartOf: reference(websiteId()),
  mainEntityOfPage: reference(webpageId('/article')),
  publisher: reference(personId()),
});

export const createItemListNode = ({
  entries,
}: {
  entries: ReadonlyArray<{ position: number; url: string; name: string }>;
}): ItemList => ({
  '@type': 'ItemList',
  itemListElement: entries.map<ListItem>(entry => ({
    '@type': 'ListItem',
    position: entry.position,
    url: entry.url,
    name: entry.name,
  })),
});

export const createCollectionPageNode = ({
  path,
  name,
  description,
  breadcrumbPath,
  mainEntity,
}: {
  path: string;
  name: string;
  description: string;
  breadcrumbPath: string;
  mainEntity: ItemList;
}): CollectionPage => ({
  '@type': 'CollectionPage',
  '@id': webpageId(path),
  url: absoluteUrl(path),
  name,
  description,
  inLanguage: siteMetadata.language,
  isPartOf: reference(websiteId()),
  breadcrumb: reference(breadcrumbId(breadcrumbPath)),
  mainEntity,
});

export const createWebPageNode = ({
  path,
  name,
  description,
}: {
  path: string;
  name: string;
  description: string;
}): WebPage => ({
  '@type': 'WebPage',
  '@id': webpageId(path),
  url: absoluteUrl(path),
  name,
  description,
  inLanguage: siteMetadata.language,
  isPartOf: reference(websiteId()),
  breadcrumb: reference(breadcrumbId(path)),
});

export const createBlogPostingImageNode = ({
  path,
  title,
  image,
}: {
  path: string;
  title: string;
  image?: string;
}): ImageObject => ({
  '@type': 'ImageObject',
  '@id': `${blogPostingId(path)}-image`,
  url: image
    ? absoluteImageUrl(image)
    : absoluteUrl(`/api/og?title=${encodeURIComponent(title)}`),
});

export const createBlogPostingNode = ({
  post,
  path,
  partOf,
}: {
  post: Article;
  path: string;
  partOf: SchemaReference;
}): BlogPosting => ({
  '@type': 'BlogPosting',
  '@id': blogPostingId(path),
  url: absoluteUrl(path),
  headline: post.metadata.title,
  description: post.metadata.summary,
  datePublished: new Date(post.metadata.publishedAt).toISOString(),
  dateModified: new Date(post.metadata.publishedAt).toISOString(),
  inLanguage: siteMetadata.language,
  mainEntityOfPage: reference(webpageId(path)),
  isPartOf: partOf,
  author: reference(personId()),
  publisher: reference(personId()),
  image: createBlogPostingImageNode({
    path,
    title: post.metadata.title,
    image: post.metadata.image,
  }),
});

export const createSoftwareApplicationNode = ({
  project,
}: {
  project: HomeProject;
}): SoftwareApplication => ({
  '@type': 'SoftwareApplication',
  '@id': softwareApplicationId(project.slug),
  url: project.url,
  name: project.name,
  description: project.description,
  applicationCategory: 'BrowserApplication',
  operatingSystem: 'Chrome, Firefox, Edge',
  creator: reference(personId()),
  sameAs: project.sameAs,
  offers: {
    '@type': 'Offer',
    price: 0,
    priceCurrency: 'USD',
  },
});

export const createSeriesItemListNode = ({
  seriesInfo,
}: {
  seriesInfo: SeriesInfo;
}): ItemList =>
  createItemListNode({
    entries: seriesInfo.articles.map(article => ({
      position: article.order,
      url: absoluteUrl(`/article/${article.slug}`),
      name: article.title,
    })),
  });
