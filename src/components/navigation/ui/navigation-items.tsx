'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { type Route } from 'next';

import { ExternalLink } from '@/components/ui/external-link';
import { cn } from '@/lib/utils';
import { NavigationItemTooltip } from '@/components/navigation/ui/navigation-item-tooltip';

type MainNavigationItemProps = {
  slug: Route<''>;
  name: string;
  icon: ReactNode;
};

export function MainNavigationItem({
  slug,
  name,
  icon,
}: MainNavigationItemProps) {
  const pathname = usePathname();
  const isActive = new RegExp(`^${slug}(\/|$)`).test(pathname);

  return (
    <NavigationItemTooltip name={name}>
      <Link
        href={slug}
        aria-current={isActive ? 'page' : undefined}
        aria-label={name}
        className="flex size-full items-center justify-center"
      >
        <div className="absolute -top-px -z-10 size-full rounded-full opacity-80 dark:bg-navigation-item-top-highlight" />
        {icon}
        <div
          className={cn(
            'absolute -bottom-1.5 left-[calc(50%-0.125rem)] size-1 rounded-full bg-gray-800',
            isActive ? 'opacity-100' : 'opacity-0'
          )}
        />
      </Link>
    </NavigationItemTooltip>
  );
}

type SocialNavigationItemProps = {
  href: string;
  name: string;
  icon: ReactNode;
};

export function SocialNavigationItem({
  href,
  name,
  icon,
}: SocialNavigationItemProps) {
  return (
    <NavigationItemTooltip name={name}>
      <ExternalLink
        href={href}
        aria-label={name}
        className="flex size-full items-center justify-center"
      >
        <div className="absolute -top-px -z-10 size-full rounded-full opacity-80 dark:bg-navigation-item-top-highlight" />
        {icon}
      </ExternalLink>
    </NavigationItemTooltip>
  );
}

type SettingNavigationItemProps = {
  name: string;
  children: ReactNode;
};

export function SettingNavigationItem({
  name,
  children,
}: SettingNavigationItemProps) {
  return (
    <NavigationItemTooltip name={name}>
      <div className="flex size-full items-center justify-center">
        <div className="absolute -top-px -z-10 size-full rounded-full opacity-80 dark:bg-navigation-item-top-highlight" />
        {children}
      </div>
    </NavigationItemTooltip>
  );
}
