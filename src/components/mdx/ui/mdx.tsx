import {
  transformerCompactLineOptions,
  transformerMetaHighlight,
  transformerMetaWordHighlight,
  transformerNotationDiff,
  transformerNotationErrorLevel,
  transformerNotationFocus,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
  transformerRenderWhitespace,
} from '@shikijs/transformers';
import { rendererRich, transformerTwoslash } from '@shikijs/twoslash';
import { MDXRemote, type MDXRemoteProps } from 'next-mdx-remote/rsc';
import type { AnchorHTMLAttributes, DetailedHTMLProps } from 'react';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeSlug from 'rehype-slug';
import smartypants from 'remark-smartypants';

import { Callout } from './callout';
import { CustomLink } from './custom-link';
import { CustomPre } from './custom-pre';
import { Heading } from './heading';
import { RoundedImage } from './rounded-image';
import { Steps } from './steps';
import { AutoplayVideo, PreLoadVideo } from './video';

import styles from '../style/mdx.module.css';

const components: MDXRemoteProps['components'] = {
  h2: props => <Heading level={2} {...props} />,
  h3: props => <Heading level={3} {...props} />,
  h4: props => <Heading level={4} {...props} />,
  img: RoundedImage,
  AutoplayVideo: AutoplayVideo,
  PreLoadVideo: PreLoadVideo,
  a: (
    props: DetailedHTMLProps<
      AnchorHTMLAttributes<HTMLAnchorElement>,
      HTMLAnchorElement
    >
  ) => {
    const { href, children, ...rest } = props;
    return (
      <CustomLink href={href} {...rest}>
        {children}
      </CustomLink>
    );
  },
  pre: CustomPre,
  Callout: Callout,
  Steps: Steps,
};

export function CustomMDX({ source }: { source: string }) {
  return (
    <div className={styles.container}>
      <MDXRemote
        source={source}
        options={{
          mdxOptions: {
            remarkPlugins: [smartypants],
            rehypePlugins: [
              [
                rehypePrettyCode,
                {
                  theme: 'vitesse-dark',
                  transformers: [
                    transformerTwoslash({
                      renderer: rendererRich(),
                      explicitTrigger: true,
                      onTwoslashError: (error, code) => {
                        console.error(error, code);
                      },
                    }),
                    transformerNotationHighlight(),
                    transformerNotationFocus({
                      classActivePre: 'has-focused-lines',
                      classActiveLine: 'has-focus',
                    }),
                    transformerNotationDiff(),
                    transformerMetaHighlight(),
                    transformerRenderWhitespace(),
                    transformerMetaWordHighlight(),
                    transformerNotationErrorLevel(),
                    transformerCompactLineOptions(),
                    transformerNotationWordHighlight(),
                  ],
                },
              ],
              rehypeSlug,
            ],
          },
        }}
        components={components}
      />
    </div>
  );
}
