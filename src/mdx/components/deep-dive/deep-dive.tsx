import { z } from 'zod';

import { cn } from '@/lib/utils';
import { createMDXComponent } from '@/mdx/common/create-mdx-component';
import { MDXZoomImage } from '@/mdx/components/zoom-image/zoom-image';

const DeepDiveBlockSchema = z.object({
  title: z.string(),
  body: z.string(),
});

const DeepDiveSchema = z.object({
  label: z.string(),
  title: z.string(),
  image: z.object({
    src: z.string(),
    alt: z.string(),
    caption: z.string().optional(),
  }),
  blocks: z.array(DeepDiveBlockSchema).min(1),
});

type DeepDiveProps = z.infer<typeof DeepDiveSchema>;

function DeepDive({ label, title, image, blocks }: DeepDiveProps) {
  return (
    <section className="not-prose my-24 border-t border-border/60 pt-14">
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

      <figure className="my-12">
        <MDXZoomImage
          src={image.src}
          alt={image.alt}
          className="mx-auto w-full max-w-3xl rounded-2xl"
        />
        {image.caption && (
          <figcaption className="sr-only">{image.caption}</figcaption>
        )}
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
