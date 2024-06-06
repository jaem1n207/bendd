import { notFound } from 'next/navigation';

import { formatDate, getArticles } from '@/app/article/utils';
import { CustomMDX } from '@/components/mdx';
import { siteMetadata } from '@/lib/site-metadata';

export async function generateStaticParams() {
  const articles = getArticles();

  return articles.map(post => ({
    slug: post.slug,
  }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const post = getArticles().find(post => post.slug === params.slug);
  if (!post) {
    return;
  }

  const {
    title,
    publishedAt: publishedTime,
    summary: description,
    image,
  } = post.metadata;
  const ogImage = image ? image : `/api/og?title=${encodeURIComponent(title)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime,
      url: `${siteMetadata.siteUrl}/blog/${post.slug}`,
      images: [
        {
          url: ogImage,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function Blog({ params }: { params: { slug: string } }) {
  const post = getArticles().find(post => post.slug === params.slug);

  if (!post) {
    notFound();
  }

  return (
    <section>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.metadata.title,
            datePublished: post.metadata.publishedAt,
            dateModified: post.metadata.publishedAt,
            description: post.metadata.summary,
            image: post.metadata.image
              ? `${siteMetadata.siteUrl}${post.metadata.image}`
              : `/og?title=${encodeURIComponent(post.metadata.title)}`,
            url: `${siteMetadata.siteUrl}/blog/${post.slug}`,
            author: {
              '@type': 'Person',
              name: siteMetadata.author,
            },
          }),
        }}
      />
      <h1 className="bd-text-2xl bd-font-semibold bd-tracking-tighter">
        {post.metadata.title}
      </h1>
      <div className="bd-mb-8 bd-mt-2 bd-flex bd-items-center bd-justify-between bd-text-sm">
        <p className="bd-text-sm bd-tabular-nums bd-text-primary/60">
          {formatDate(post.metadata.publishedAt)}
        </p>
      </div>
      <article className="bd-prose bd-prose-slate dark:bd-prose-invert">
        <CustomMDX source={post.content} />
      </article>
    </section>
  );
}
