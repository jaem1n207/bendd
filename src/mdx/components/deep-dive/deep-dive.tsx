import { z } from 'zod';

import { cn } from '@/lib/utils';
import { createMDXComponent } from '@/mdx/common/create-mdx-component';
import { MDXZoomImage } from '@/mdx/components/zoom-image/zoom-image';

const DeepDiveBlockSchema = z.object({
  title: z.string(),
  body: z.string(),
});

const DeepDiveMediaSchema = z.object({
  src: z.string(),
  alt: z.string(),
  caption: z.string().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

const DeepDiveSchema = z
  .object({
    label: z.string(),
    title: z.string(),
    image: DeepDiveMediaSchema.optional(),
    media: z.array(DeepDiveMediaSchema).min(1).optional(),
    blocks: z.array(DeepDiveBlockSchema).min(1),
  })
  .refine(props => props.image || props.media, {
    message: 'image or media is required',
  });

type DeepDiveProps = z.infer<typeof DeepDiveSchema>;

function DeepDive({ label, title, image, media, blocks }: DeepDiveProps) {
  const mediaItems = media ?? (image ? [image] : []);

  return (
    <section className="not-prose mb-20 mt-14">
      <span
        className={cn(
          'inline-flex items-center rounded-full border border-border/70',
          'bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground'
        )}
      >
        {label}
      </span>
      <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground md:text-2xl">
        {title}
      </h3>

      <figure className="my-10 space-y-4">
        {mediaItems.map(item => (
          <div key={item.src}>
            <MDXZoomImage
              src={item.src}
              alt={item.alt}
              width={item.width}
              height={item.height}
              className="mx-auto w-full max-w-3xl rounded-2xl object-contain"
            />
            {item.caption && (
              <figcaption className="sr-only">{item.caption}</figcaption>
            )}
          </div>
        ))}
      </figure>

      <div className="space-y-6">
        {blocks.map(block => (
          <section key={block.title}>
            <h4 className="mb-1 text-base font-semibold tracking-tight text-foreground">
              {block.title}
            </h4>
            <p className="text-base leading-7 text-foreground/75">
              {block.body}
            </p>
          </section>
        ))}
      </div>
    </section>
  );
}

export const MDXDeepDive = createMDXComponent(DeepDive, DeepDiveSchema);
