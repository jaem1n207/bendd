import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'bd-inline-flex bd-items-center bd-justify-center bd-whitespace-nowrap bd-rounded-md bd-text-sm bd-font-medium bd-ring-offset-background bd-transition-colors focus-visible:bd-outline-none focus-visible:bd-ring-2 focus-visible:bd-ring-ring focus-visible:bd-ring-offset-2 disabled:bd-pointer-events-none disabled:bd-opacity-50',
  {
    variants: {
      variant: {
        default:
          'bd-bg-primary bd-text-primary-foreground hover:bd-bg-primary/90',
        destructive:
          'bd-bg-destructive bd-text-destructive-foreground hover:bd-bg-destructive/90',
        outline:
          'bd-border bd-border-input bd-bg-background hover:bd-bg-accent hover:bd-text-accent-foreground',
        secondary:
          'bd-bg-secondary bd-text-secondary-foreground hover:bd-bg-secondary/80',
        ghost: 'hover:bd-bg-accent hover:bd-text-accent-foreground',
        link: 'bd-text-primary bd-underline-offset-4 hover:bd-underline',
      },
      size: {
        default: 'bd-h-10 bd-px-4 bd-py-2',
        sm: 'bd-h-9 bd-rounded-md bd-px-3',
        lg: 'bd-h-11 bd-rounded-md bd-px-8',
        icon: 'bd-h-10 bd-w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
