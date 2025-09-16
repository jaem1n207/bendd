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

import { MDXCustomLink } from './components/a/custom-link';
import { MDXCallout } from './components/callout/callout';
import { MDXHeading } from './components/heading/heading';
import { MDXImeScrollDemo } from './components/ime-scroll-demo/ime-scroll-demo';
import { MDXRoundedImage } from './components/img/rounded-image';
import { MDXMagicMove } from './components/magic-move/magic-move';
import { MDXPre } from './components/pre/pre';
import { MDXShuffleLettersDemo } from './components/shuffle-letters-demo/shuffle-letters-demo';
import { MDXSteps } from './components/steps/steps';
import { MDXAutoplayVideo, MDXPreLoadVideo } from './components/video/video';

import styles from './mdx.module.css';

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
  MagicMove: MDXMagicMove,
  Callout: MDXCallout,
  Steps: MDXSteps,
  ShuffleLettersDemo: MDXShuffleLettersDemo,
  ImeScrollDemo: MDXImeScrollDemo,
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
