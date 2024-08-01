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

import { MDXCallout } from './callout';
import { MDXCustomLink } from './custom-link';
import { MDXPre } from './custom-pre';
import { MDXHeading } from './heading';
import { MDXRoundedImage } from './rounded-image';
import { MDXShikiMagicMoveWrapper } from './shiki-magic-move-wrapper';
import { MDXSteps } from './steps';
import { MDXAutoplayVideo, MDXPreLoadVideo } from './video';

import styles from '../style/mdx.module.css';

const components: MDXRemoteProps['components'] = {
  h2: props => <MDXHeading level={2} {...props} />,
  h3: props => <MDXHeading level={3} {...props} />,
  h4: props => <MDXHeading level={4} {...props} />,
  img: MDXRoundedImage,
  a: (
    props: DetailedHTMLProps<
      AnchorHTMLAttributes<HTMLAnchorElement>,
      HTMLAnchorElement
    >
  ) => {
    const { href, children, ...rest } = props;
    return (
      <MDXCustomLink href={href} {...rest}>
        {children}
      </MDXCustomLink>
    );
  },
  pre: MDXPre,
  AutoplayVideo: MDXAutoplayVideo,
  PreLoadVideo: MDXPreLoadVideo,
  MagicMove: MDXShikiMagicMoveWrapper,
  Callout: MDXCallout,
  Steps: MDXSteps,
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
