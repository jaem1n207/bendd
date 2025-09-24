import * as React from 'react';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'bd:file:text-foreground bd:placeholder:text-muted-foreground bd:selection:bg-primary bd:selection:text-primary-foreground bd:dark:bg-input/30 bd:border-input bd:h-9 bd:w-full bd:min-w-0 bd:rounded-md bd:border bd:bg-transparent bd:px-3 bd:py-1 bd:text-base bd:shadow-xs bd:transition-[color,box-shadow] bd:outline-none bd:file:inline-flex bd:file:h-7 bd:file:border-0 bd:file:bg-transparent bd:file:text-sm bd:file:font-medium bd:disabled:pointer-events-none bd:disabled:cursor-not-allowed bd:disabled:opacity-50 bd:md:text-sm',
        'bd:focus-visible:border-ring bd:focus-visible:ring-ring/50 bd:focus-visible:ring-[3px]',
        'bd:aria-invalid:ring-destructive/20 bd:dark:aria-invalid:ring-destructive/40 bd:aria-invalid:border-destructive',
        className
      )}
      {...props}
    />
  );
}

export { Input };
