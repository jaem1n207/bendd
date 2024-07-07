import { MDXRemote, type MDXRemoteProps } from 'next-mdx-remote/rsc';
import Image from 'next/image';
import Link from 'next/link';
import {
  type AnchorHTMLAttributes,
  createElement,
  type DetailedHTMLProps,
  type HTMLAttributes,
  type ImgHTMLAttributes,
} from 'react';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeSlug from 'rehype-slug';

function CustomLink({
  href,
  children,
  ...props
}: {
  href: string;
  children: React.ReactNode;
  [key: string]: any;
}) {
  if (href.startsWith('/')) {
    return (
      <Link href={href} {...props}>
        {props.children}
      </Link>
    );
  }

  if (href.startsWith('#')) {
    return <a {...props} />;
  }

  return (
    <a target="_blank" rel="noopener noreferrer" href={href} {...props}>
      {children}
    </a>
  );
}

function RoundedImage({ alt, src }: { alt: string; src: string }): JSX.Element {
  return (
    <Image
      alt={alt}
      src={src}
      width={1344}
      height={768}
      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 672px"
      className="bd-rounded-lg bd-object-cover"
    />
  );
}

function Heading({
  level,
  children,
  ...props
}: React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLHeadingElement>,
  HTMLHeadingElement
> & {
  level: 2 | 3 | 4;
}) {
  const tag = `h${level}`;
  return createElement(tag, props, <a href={`#${props.id}`}>{children}</a>);
}

// function Table({ data }: { data: { headers: string[]; rows: string[][] } }) {
//   let headers = data.headers.map((header, index) => (
//     <th key={index}>{header}</th>
//   ));
//   let rows = data.rows.map((row, index) => (
//     <tr key={index}>
//       {row.map((cell, cellIndex) => (
//         <td key={cellIndex}>{cell}</td>
//       ))}
//     </tr>
//   ));

//   return (
//     <table>
//       <thead>
//         <tr>{headers}</tr>
//       </thead>
//       <tbody>{rows}</tbody>
//     </table>
//   );
// }

let components: MDXRemoteProps['components'] = {
  h2: props => <Heading level={2} {...props} />,
  h3: props => <Heading level={3} {...props} />,
  h4: props => <Heading level={4} {...props} />,
  img: (
    props: DetailedHTMLProps<
      ImgHTMLAttributes<HTMLImageElement>,
      HTMLImageElement
    >
  ) => {
    const { alt = '', src, ...rest } = props;
    return <RoundedImage alt={alt} src={src || ''} {...rest} />;
  },
  a: (
    props: DetailedHTMLProps<
      AnchorHTMLAttributes<HTMLAnchorElement>,
      HTMLAnchorElement
    >
  ) => {
    const { href = '', children, ...rest } = props;
    return <CustomLink href={href}>{children}</CustomLink>;
  },
  pre: (
    props: DetailedHTMLProps<HTMLAttributes<HTMLPreElement>, HTMLPreElement>
  ) => {
    const { children, ...rest } = props;
    return (
      <pre
        className="bd-overflow-x-auto bd-rounded-lg bd-border bd-border-solid bd-border-border bd-bg-neutral-900 bd-px-0 bd-py-3 dark:bd-bg-gray-100"
        {...rest}
      >
        {children}
      </pre>
    );
  },
  // table: (
  //   props: DetailedHTMLProps<
  //     TableHTMLAttributes<HTMLTableElement>,
  //     HTMLTableElement
  //   >
  // ) => {
  //   const { children, ...rest } = props;
  // },
};

export function CustomMDX({ source }: { source: string }) {
  return (
    <>
      <MDXRemote
        source={source}
        options={{
          mdxOptions: {
            rehypePlugins: [
              [
                rehypePrettyCode,
                {
                  defaultLang: '.token',
                  theme: {
                    dark: 'github-dark-dimmed',
                    light: 'github-light',
                  },
                },
              ],
              rehypeSlug,
            ],
          },
        }}
        components={components}
      />
    </>
  );
}
