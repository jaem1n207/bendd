import { cva } from 'class-variance-authority';
import Link from 'next/link';
import { type ReactNode } from 'react';

import { siteMetadata } from '@/lib/site-metadata';

import { Book, Bulb, Gallery, GitHub, Home, Mail, Youtube } from './icons';
import { NavigationDock, NavigationDockItem } from './navigation-dock';
import { ThemeSwitcher } from './theme-switcher';
import { ExternalLink } from './ui/external-link';
import { Separator } from './ui/separator';

interface CommonItem {
  name: string;
}

interface MainItem extends CommonItem {
  slug: string;
  icon: ReactNode;
  disabled?: boolean;
}

interface SocialItem extends CommonItem {
  href: string;
  icon: ReactNode;
  disabled?: boolean;
}

interface SettingsItem extends CommonItem {
  children: ReactNode;
}

const navigationItemSvg = cva('bd-size-1/2 bd-text-gray-900');

const items: {
  name: string;
  items: (MainItem | SocialItem | SettingsItem)[];
}[] = [
  {
    name: 'main',
    items: [
      {
        name: 'Home',
        slug: '/',
        icon: <Home className={navigationItemSvg()} />,
      },
      {
        name: 'Projects',
        slug: '/projects',
        icon: <Bulb className={navigationItemSvg()} />,
        disabled: true,
      },
      {
        name: 'Article',
        slug: '/article',
        icon: <Book className={navigationItemSvg()} />,
      },
      {
        name: 'Photos',
        slug: '/photo',
        icon: <Gallery className={navigationItemSvg()} />,
        disabled: true,
      },
    ],
  },
  {
    name: 'socials',
    items: [
      {
        name: 'GitHub',
        href: siteMetadata.github,
        icon: <GitHub className={navigationItemSvg()} />,
      },
      {
        name: 'YouTube',
        href: siteMetadata.youtube,
        icon: <Youtube className={navigationItemSvg()} />,
      },
      {
        name: 'Mail',
        href: `mailto:${siteMetadata.email}`,
        icon: <Mail className={navigationItemSvg()} />,
      },
    ],
  },
  {
    name: 'settings',
    items: [
      {
        name: 'Toggle theme',
        children: <ThemeSwitcher />,
      },
    ],
  },
];

export function Navigation() {
  return (
    <>
      <div
        aria-hidden="true"
        className="dark:bd-absolute dark:-bd-top-[1px] dark:-bd-z-10 dark:bd-h-[1px] dark:bd-w-[95%] dark:bd-bg-navigation-highlight dark:bd-opacity-20"
      />
      <NavigationDock>
        {items.map((section, index) => {
          const isLastSection = index === items.length - 1;

          return (
            <>
              {section.items.map(item => {
                if ('slug' in item) {
                  if (item.disabled) return null;

                  return (
                    <NavigationDockItem
                      key={item.name}
                      slug={item.slug}
                      name={item.name}
                    >
                      <Link
                        key={item.slug}
                        href={item.slug}
                        tabIndex={item.disabled ? -1 : undefined}
                        aria-label={item.name}
                        aria-disabled={item.disabled}
                        className="bd-flex bd-size-full bd-items-center bd-justify-center"
                      >
                        {item.icon}
                      </Link>
                    </NavigationDockItem>
                  );
                }

                if ('href' in item) {
                  return (
                    <NavigationDockItem key={item.name} name={item.name}>
                      <ExternalLink
                        key={item.href}
                        href={item.href}
                        aria-label={item.name}
                        className="bd-flex bd-size-full bd-items-center bd-justify-center"
                      >
                        {item.icon}
                      </ExternalLink>
                    </NavigationDockItem>
                  );
                }

                return (
                  <NavigationDockItem key={item.name} name={item.name}>
                    {item.children}
                  </NavigationDockItem>
                );
              })}
              {!isLastSection && (
                <Separator
                  orientation="vertical"
                  className="bd-mx-2 !bd-h-9"
                  style={{
                    maskImage:
                      'linear-gradient(0deg, transparent, rgb(255, 255, 255) 16px, rgb(255, 255, 255) calc(100% - 16px), transparent)',
                  }}
                />
              )}
            </>
          );
        })}
      </NavigationDock>
    </>
  );
}
