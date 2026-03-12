import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';

export const typographyVariants = cva(null, {
  variants: {
    variant: {
      h1: 'scroll-m-20 text-4xl font-extrabold tracking-tight md:text-5xl',
      h2: 'scroll-m-20 text-3xl font-semibold tracking-tight md:text-4xl',
      h3: 'scroll-m-20 text-2xl font-semibold tracking-tight md:text-3xl',
      h4: 'scroll-m-20 text-xl font-semibold md:text-2xl',
      h5: 'text-lg font-semibold md:text-xl',
      p: 'leading-7 [&:not(:first-child)]:mt-6',
      blockquote:
        '-ml-4 border-l-4 px-4 py-2 text-base text-muted-foreground',
    },
    affects: {
      default: '',
      primary: 'text-primary',
      lead: 'text-xl text-muted-foreground',
      large: 'text-lg font-semibold',
      small: 'text-sm font-medium leading-none',
      muted: 'text-sm text-muted-foreground',
    },
    prose: {
      removePMargin: '[&:not(:first-child)]:!mt-0',
    },
  },
  defaultVariants: {
    variant: 'h1',
    affects: 'default',
  },
});

interface TypographyProps
  extends HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof typographyVariants> {
  asChild?: boolean;
}

export const Typography = forwardRef<HTMLParagraphElement, TypographyProps>(
  ({ className, variant, affects, prose, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'h1';
    return (
      <Comp
        className={cn(
          typographyVariants({ variant, affects, prose, className })
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Typography.displayName = 'Typography';
