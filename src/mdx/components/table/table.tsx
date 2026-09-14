import { isValidElement, type ReactNode } from 'react';
import { z } from 'zod';

import { FluidHover } from '@/components/ui/fluid-hover';
import { cn } from '@/lib/utils';
import { createMDXComponent } from '@/mdx/common/create-mdx-component';

const TableSchema = z.object({
  children: z.custom<ReactNode>(
    value => isValidElement(value) || Array.isArray(value)
  ),
  className: z.string().optional(),
});

function Table({ children, className }: z.infer<typeof TableSchema>) {
  return (
    <FluidHover
      itemSelector="tbody tr"
      highlightClassName="rounded-none bg-muted/50"
    >
      <div className="my-6 overflow-x-auto">
        <table className={cn('!my-0', className)}>{children}</table>
      </div>
    </FluidHover>
  );
}

export const MDXTable = createMDXComponent(Table, TableSchema);
