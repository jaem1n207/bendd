import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';

export const typographyVariants = cva(null, {
  variants: {
    variant: {
      h1: 'bd:scroll-m-20 bd:text-4xl bd:font-extrabold bd:tracking-tight bd:lg:text-5xl',
      h2: 'bd:scroll-m-20 bd:py-2 bd:text-3xl bd:font-semibold bd:tracking-tight bd:first:mt-0',
      h3: 'bd:scroll-m-20 bd:text-2xl bd:font-semibold bd:tracking-tight',
      h4: 'bd:scroll-m-20 bd:text-xl bd:font-semibold bd:tracking-tight',
      h5: 'bd:text-lg bd:font-semibold bd:lg:text-xl',
      p: 'bd:leading-7',
      lead: 'bd:text-xl bd:text-muted-foreground',
      large: 'bd:text-lg bd:font-semibold',
      small: 'bd:text-sm bd:font-medium bd:leading-none',
      muted: 'bd:text-sm bd:text-muted-foreground',
      inlineCode:
        'bd:relative bd:rounded-sm bd:bg-muted bd:px-[0.3rem] bd:py-[0.2rem] bd:font-mono bd:text-sm bd:font-semibold',
      multilineCode:
        'bd:relative bd:rounded-sm bd:bg-muted bd:p-4 bd:font-mono bd:text-sm bd:font-semibold bd:overflow-x-auto',
      list: 'bd:my-6 bd:ml-6 bd:list-disc bd:[&>li]:mt-2',
      blockquote:
        'bd:mt-6 bd:border-l-2 bd:pl-6 bd:italic bd:text-muted-foreground',
    },
    affects: {
      default: '',
      primary: 'bd:text-primary',
      muted: 'bd:text-muted-foreground bd:text-sm bd:leading-7',
    },
  },
  defaultVariants: {
    variant: 'p',
    affects: 'default',
  },
});

interface TypographyProps
  extends HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  asChild?: boolean;
}

export const Typography = forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant, affects, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : getDefaultElement(variant || 'p');

    return (
      <Comp
        className={cn(typographyVariants({ variant, affects, className }))}
        ref={ref as any}
        {...props}
      />
    );
  }
);

function getDefaultElement(variant: string) {
  switch (variant) {
    case 'h1':
      return 'h1';
    case 'h2':
      return 'h2';
    case 'h3':
      return 'h3';
    case 'h4':
      return 'h4';
    case 'h5':
      return 'h5';
    case 'p':
    case 'lead':
      return 'p';
    case 'large':
      return 'div';
    case 'small':
      return 'p';
    case 'muted':
      return 'span';
    case 'inlineCode':
      return 'code';
    case 'multilineCode':
      return 'pre';
    case 'list':
      return 'ul';
    case 'blockquote':
      return 'blockquote';
    default:
      return 'span';
  }
}

Typography.displayName = 'Typography';
