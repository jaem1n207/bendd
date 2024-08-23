import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';

export const typographyVariants = cva(null, {
  variants: {
    variant: {
      h1: 'bd-scroll-m-20 bd-text-4xl bd-font-extrabold bd-tracking-tight md:bd-text-5xl',
      h2: 'bd-scroll-m-20 bd-text-3xl bd-font-semibold bd-tracking-tight md:bd-text-4xl',
      h3: 'bd-scroll-m-20 bd-text-2xl bd-font-semibold bd-tracking-tight md:bd-text-3xl',
      h4: 'bd-scroll-m-20 bd-text-xl bd-font-semibold md:bd-text-2xl',
      h5: 'bd-text-lg bd-font-semibold md:bd-text-xl',
      p: 'bd-leading-7 [&:not(:first-child)]:bd-mt-6',
    },
    affects: {
      default: '',
      primary: 'bd-text-primary',
      lead: 'bd-text-xl bd-text-muted-foreground',
      large: 'bd-text-lg bd-font-semibold',
      small: 'bd-text-sm bd-font-medium bd-leading-none',
      muted: 'bd-text-sm bd-text-muted-foreground',
      removePMargin: '[&:not(:first-child)]:!bd-mt-0',
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
  ({ className, variant, affects, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'h1';
    return (
      <Comp
        className={cn(typographyVariants({ variant, affects, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Typography.displayName = 'Typography';
