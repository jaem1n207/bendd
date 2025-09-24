import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

const linkVariants = cva('bd:select-none bd:transition-colors', {
  variants: {
    variant: {
      default: 'bd:text-muted-foreground bd:hover:text-primary',
      primary: 'bd:text-primary bd:hover:text-primary/90',
      icon: 'bd:opacity-75 bd:hover:text-primary/90 bd:hover:opacity-100',
    },
    affects: {
      default: '',
      mdx: 'bd:text-sm bd:decoration-1 bd:underline-offset-4',
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
            'bd:space-x-1 bd:leading-tight': prefixEl || suffixEl,
          },
          linkVariants({ variant, affects }),
          {
            'bd:pointer-events-none bd:opacity-50': disabled,
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
