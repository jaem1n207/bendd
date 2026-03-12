import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

const linkVariants = cva('select-none transition-colors', {
  variants: {
    variant: {
      default: 'text-muted-foreground hover:text-primary',
      primary: 'text-primary hover:text-primary/90',
      icon: 'opacity-75 hover:text-primary/90 hover:opacity-100',
    },
    affects: {
      default: '',
      mdx: 'text-sm decoration-1 underline-offset-4',
    },
  },
  defaultVariants: {
    variant: 'default',
    affects: 'default',
  },
});

type LinkProps = {
  /**
   * 링크에 `target="_blank"` 속성을 추가하고 보안 취약점을 방지합니다.
   *
   * @default true
   */
  external?: boolean;
  /**
   * 비활성화 상태를 설정합니다.
   * @default false
   */
  disabled?: boolean;
  /**
   * 자식 요소의 앞에 표시할 요소입니다.
   */
  prefixEl?: ReactNode;
  /**
   * 자식 요소의 뒤에 표시할 요소입니다.
   */
  suffixEl?: ReactNode;
} & AnchorHTMLAttributes<HTMLAnchorElement> &
  VariantProps<typeof linkVariants>;

export const ExternalLink = forwardRef<HTMLAnchorElement, LinkProps>(
  (
    {
      className,
      variant,
      affects,
      external = true,
      disabled = false,
      prefixEl,
      suffixEl,
      children,
      ...props
    },
    ref
  ) => {
    const externalAttributes = {
      ...(external && { target: '_blank', rel: 'noopener noreferrer' }),
    };

    return (
      <a
        className={cn(
          {
            'inline-flex items-center gap-1 leading-tight': prefixEl || suffixEl,
          },
          linkVariants({ variant, affects }),
          {
            'pointer-events-none opacity-50': disabled,
          },
          className
        )}
        ref={ref}
        aria-disabled={disabled}
        aria-hidden={disabled}
        tabIndex={disabled ? -1 : undefined}
        {...externalAttributes}
        {...props}
      >
        {prefixEl}
        {children}
        {suffixEl}
      </a>
    );
  }
);

ExternalLink.displayName = 'ExternalLink';
