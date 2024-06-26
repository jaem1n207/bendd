import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';

const titleVariants = cva(null, {
  variants: {
    variant: {
      default: '',
      primary: 'bd-text-primary',
    },
    size: {
      h1: 'bd-tracking-tight bd-font-extrabold bd-text-4xl md:bd-text-5xl',
      h2: 'bd-tracking-tight bd-font-semibold bd-text-3xl md:bd-text-4xl',
      h3: 'bd-tracking-tight bd-font-semibold bd-text-2xl md:bd-text-3xl',
      h4: 'bd-font-semibold bd-text-xl md:bd-text-2xl',
      h5: 'bd-font-semibold bd-text-lg md:bd-text-xl',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'h1',
  },
});

interface TitleProps
  extends HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof titleVariants> {
  asChild?: boolean;
}

const Title = forwardRef<HTMLHeadingElement, TitleProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'h1';
    return (
      <Comp
        className={cn(titleVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Title.displayName = 'Title';

const paragraphVariants = cva(null, {
  variants: {
    variant: {
      default: '',
      primary: 'bd-text-primary',
      muted: 'bd-text-muted-foreground',
    },
    size: {
      default: 'bd-leading-7',
      sm: 'bd-font-medium bd-leading-none bd-text-sm',
      lg: 'bd-font-semibold bd-text-lg',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

interface ParagraphProps
  extends HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof paragraphVariants> {
  asChild?: boolean;
}

const Paragraph = forwardRef<HTMLParagraphElement, ParagraphProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'p';
    return (
      <Comp
        className={cn(paragraphVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Paragraph.displayName = 'Paragraph';

export { Paragraph, Title };
