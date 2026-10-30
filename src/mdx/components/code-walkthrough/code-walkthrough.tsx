import { z } from 'zod';

import { CodeWalkthrough } from '@/components/code-walkthrough';
import { createMDXComponent } from '@/mdx/common/create-mdx-component';

const FocusRangeSchema = z
  .object({
    startLine: z.number().int().positive(),
    endLine: z.number().int().positive().optional(),
    startColumn: z.number().int().positive().optional(),
    endColumn: z.number().int().positive().optional(),
  })
  .refine(range => (range.endLine ?? range.startLine) >= range.startLine, {
    message: 'endLine must not precede startLine',
  })
  .refine(
    range =>
      (range.endLine ?? range.startLine) !== range.startLine ||
      range.endColumn === undefined ||
      range.endColumn >= (range.startColumn ?? 1),
    { message: 'endColumn must not precede startColumn on the same line' }
  );

const CodeWalkthroughSchema = z.object({
  lang: z.string().min(1),
  filename: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  steps: z
    .array(
      z.object({
        title: z.string().min(1),
        code: z.string().min(1),
        annotations: z
          .array(
            z.object({
              title: z.string().min(1),
              description: z.string().min(1),
              focus: z.array(FocusRangeSchema).optional(),
            })
          )
          .min(1),
      })
    )
    .min(1),
});

function Walkthrough(props: z.infer<typeof CodeWalkthroughSchema>) {
  return <CodeWalkthrough {...props} />;
}

export const MDXCodeWalkthrough = createMDXComponent(
  Walkthrough,
  CodeWalkthroughSchema
);
