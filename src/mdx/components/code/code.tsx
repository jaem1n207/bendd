import type { ReactNode } from 'react';
import { z } from 'zod';

import { cn } from '@/lib/utils';
import { createMDXComponent } from '@/mdx/common/create-mdx-component';

const CodeSchema = z
  .object({
    children: z.custom<ReactNode>(),
    className: z.string().optional(),
  })
  .passthrough();

function Code({ className, ...props }: z.infer<typeof CodeSchema>) {
  return (
    <code {...props} className={cn('notranslate', className)} translate="no" />
  );
}

export const MDXCode = createMDXComponent(Code, CodeSchema);
