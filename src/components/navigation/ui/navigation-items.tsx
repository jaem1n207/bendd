'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { type Route } from 'next';

import { ExternalLink } from '@/components/ui/external-link';
import { cn } from '@/lib/utils';
import type { ItemMotionProps } from '../types/motion';
import { NavigationItemTooltip } from './navigation-item-tooltip';

type MainNavigationItemProps = {
  slug: Route<''>;
  name: string;
  icon: ReactNode;
} & ItemMotionProps;

export function MainNavigationItem({
  slug,
  name,
  icon,
  ...motionProps
}: MainNavigationItemProps) {
  const pathname = usePathname();
  const isActive = new RegExp(`^${slug}(\/|$)`).test(pathname);

  return (
    <NavigationItemTooltip content={name} name={name} {...motionProps}>
      <Link
        href={slug}
        aria-label={name}
        className="flex size-full items-center justify-center"
      >
        <div className="absolute -top-[1px] -z-10 size-full rounded-full opacity-80 dark:bg-navigation-item-top-highlight" />
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
} & ItemMotionProps;

export function SocialNavigationItem({
  href,
  name,
  icon,
  ...motionProps
}: SocialNavigationItemProps) {
  return (
    <NavigationItemTooltip content={name} name={name} {...motionProps}>
      <ExternalLink
        href={href}
        aria-label={name}
        className="flex size-full items-center justify-center"
      >
        <div className="absolute -top-[1px] -z-10 size-full rounded-full opacity-80 dark:bg-navigation-item-top-highlight" />
        {icon}
      </ExternalLink>
    </NavigationItemTooltip>
  );
}

type SettingNavigationItemProps = {
  name: string;
  children: ReactNode;
} & ItemMotionProps;

export function SettingNavigationItem({
  name,
  children,
  ...motionProps
}: SettingNavigationItemProps) {
  return (
    <NavigationItemTooltip content={name} name={name} {...motionProps}>
      <div className="flex size-full items-center justify-center">
        <div className="absolute -top-[1px] -z-10 size-full rounded-full opacity-80 dark:bg-navigation-item-top-highlight" />
        {children}
      </div>
    </NavigationItemTooltip>
  );
}
