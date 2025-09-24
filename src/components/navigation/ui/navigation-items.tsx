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
        className="bd:flex bd:size-full bd:items-center bd:justify-center"
      >
        <div className="bd:absolute bd:-top-[1px] bd:-z-10 bd:size-full bd:rounded-full bd:opacity-80 bd:dark:bg-navigation-item-top-highlight" />
        {icon}
        <div
          className={cn(
            'bd:absolute bd:-bottom-1.5 bd:left-[calc(50%-0.125rem)] bd:size-1 bd:rounded-full bd:bg-gray-800',
            isActive ? 'bd:opacity-100' : 'bd:opacity-0'
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
        className="bd:flex bd:size-full bd:items-center bd:justify-center"
      >
        <div className="bd:absolute bd:-top-[1px] bd:-z-10 bd:size-full bd:rounded-full bd:opacity-80 bd:dark:bg-navigation-item-top-highlight" />
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
      <div className="bd:flex bd:size-full bd:items-center bd:justify-center">
        <div className="bd:absolute bd:-top-[1px] bd:-z-10 bd:size-full bd:rounded-full bd:opacity-80 bd:dark:bg-navigation-item-top-highlight" />
        {children}
      </div>
    </NavigationItemTooltip>
  );
}
