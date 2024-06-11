import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

const linkVariants = cva(
  'select-none interactive-focus-ring transition-color',
  {
    variants: {
      variant: {
        default: 'bd-text-foreground/60 hover:bd-text-foreground/100',
        primary: 'bd-text-primary/90 hover:bd-text-primary/100',
        icon: 'bd-opacity-75 hover:bd-opacity-100 hover:bd-text-primary/90',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

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
            'bd-flex bd-items-center bd-space-x-1 bd-leading-tight':
              prefixEl || suffixEl,
          },
          linkVariants({ variant, className }),
          {
            'bd-pointer-events-none bd-opacity-50': disabled,
          }
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
