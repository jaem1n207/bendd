import { z } from 'zod';

import { MDXZoomImage } from '@/mdx/components/zoom-image/zoom-image';
import { createMDXComponent } from '@/mdx/common/create-mdx-component';

const VisualStackMediaSchema = z.object({
  src: z.string(),
  alt: z.string(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

const VisualStackSchema = z.object({
  media: z.array(VisualStackMediaSchema).min(1),
  caption: z.string().optional(),
});

type VisualStackProps = z.infer<typeof VisualStackSchema>;

function VisualStack({ media, caption }: VisualStackProps) {
  return (
    <figure className="not-prose my-12 space-y-4">
      {media.map(item => (
        <MDXZoomImage
          key={item.src}
          src={item.src}
          alt={item.alt}
          width={item.width}
          height={item.height}
          className="mx-auto w-full max-w-3xl rounded-2xl object-contain"
        />
      ))}
      {caption && (
        <figcaption className="mx-auto max-w-2xl text-center text-sm leading-6 text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

export const MDXVisualStack = createMDXComponent(
  VisualStack,
  VisualStackSchema
);
