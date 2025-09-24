import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'bd:inline-flex bd:items-center bd:justify-center bd:gap-2 bd:whitespace-nowrap bd:rounded-md bd:text-sm bd:font-medium bd:transition-all bd:disabled:pointer-events-none bd:disabled:opacity-50 bd:[&_svg]:pointer-events-none bd:[&_svg:not([class*=size-])]:size-4 bd:shrink-0 bd:[&_svg]:shrink-0 bd:outline-none bd:focus-visible:border-ring bd:focus-visible:ring-ring/50 bd:focus-visible:ring-[3px] bd:aria-invalid:ring-destructive/20 bd:dark:aria-invalid:ring-destructive/40 bd:aria-invalid:border-destructive',
  {
    variants: {
      variant: {
        default:
          'bd:bg-primary bd:text-primary-foreground bd:hover:bg-primary/90',
        destructive:
          'bd:bg-destructive bd:text-white bd:hover:bg-destructive/90 bd:focus-visible:ring-destructive/20 bd:dark:focus-visible:ring-destructive/40 bd:dark:bg-destructive/60',
        outline:
          'bd:border bd:bg-background bd:shadow-xs bd:hover:bg-accent bd:hover:text-accent-foreground bd:dark:bg-input/30 bd:dark:border-input bd:dark:hover:bg-input/50',
        secondary:
          'bd:bg-secondary bd:text-secondary-foreground bd:hover:bg-secondary/80',
        ghost:
          'bd:hover:bg-accent bd:hover:text-accent-foreground bd:dark:hover:bg-accent/50',
        link: 'bd:text-primary bd:underline-offset-4 bd:hover:underline',
      },
      size: {
        default: 'bd:h-9 bd:px-4 bd:py-2 bd:has-[>svg]:px-3',
        sm: 'bd:h-8 bd:rounded-md bd:gap-1.5 bd:px-3 bd:has-[>svg]:px-2.5',
        lg: 'bd:h-10 bd:rounded-md bd:px-6 bd:has-[>svg]:px-4',
        icon: 'bd:size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
