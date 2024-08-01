import { siteMetadata } from '@/lib/site-metadata';
import { createCraftMDXProcessor, createMDXProcessor } from '@/mdx';

type RssItem = {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  author?: string;
  guid?: string;
};

type Rss = {
  title: string;
  description: string;
  lang: string;
  link: string;
  items: RssItem[];
};

export async function GET() {
  const processor = createMDXProcessor();
  const craftProcessor = createCraftMDXProcessor();

  const items: RssItem[] = processor.map(article => {
    return {
      title: article.metadata.title,
      description: article.metadata.summary,
      link: `${siteMetadata.siteUrl}/article/${article.slug}`,
      pubDate: new Date(article.metadata.publishedAt).toUTCString(),
      guid: `${siteMetadata.siteUrl}/article/${article.slug}`,
    };
  });

  const craftItems: RssItem[] = craftProcessor.map(article => {
    return {
      title: article.metadata.title,
      description: article.metadata.summary,
      link: `${siteMetadata.siteUrl}/craft/${article.slug}`,
      pubDate: new Date(article.metadata.publishedAt).toUTCString(),
      guid: `${siteMetadata.siteUrl}/craft/${article.slug}`,
    };
  });

  const rss: Rss = {
    title: siteMetadata.title,
    description: siteMetadata.description,
    lang: siteMetadata.language,
    link: siteMetadata.siteUrl,
    items: [...items, ...craftItems],
  };

  const generateRss = ({ title, description, lang, link, items }: Rss) => {
    return `<?xml version="1.0" encoding="UTF-8"?>
      <rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
        <channel>
          <title><![CDATA[${title}]]></title>
          <description><![CDATA[${description}]]></description>
          <link>${link}/</link>
          <language>${lang}</language>
          <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
          <atom:link href="${link}/rss.xml" rel="self" type="application/rss+xml" />
          ${items
            .map(
              ({ title, link, description, pubDate, author, guid }) => `
              <item>
                <title><![CDATA[${title}]]></title>
                <description><![CDATA[${description}]]></description>
                <link>${link}</link>
                <pubDate>${pubDate}</pubDate>
                ${author ? `<author>${author}</author>` : ''}
                ${guid ? `<guid isPermaLink="false">${guid}</guid>` : ''}
              </item>
            `
            )
            .join('')}
        </channel>
      </rss>`;
  };

  return new Response(generateRss(rss), {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
