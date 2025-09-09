import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'bd-flex bd-h-10 bd-w-full bd-rounded-md bd-border bd-border-input bd-bg-background bd-px-3 bd-py-2 bd-text-base bd-ring-offset-background file:bd-border-0 file:bd-bg-transparent file:bd-text-sm file:bd-font-medium file:bd-text-foreground placeholder:bd-text-muted-foreground focus-visible:bd-outline-none focus-visible:bd-ring-2 focus-visible:bd-ring-ring focus-visible:bd-ring-offset-2 disabled:bd-cursor-not-allowed disabled:bd-opacity-50 md:bd-text-sm',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
