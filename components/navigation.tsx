import {
  Camera,
  Github,
  Home,
  Layers,
  Mail,
  Package,
  Pickaxe,
  Youtube,
} from 'lucide-react';
import Link from 'next/link';
import { type ReactNode } from 'react';

import { siteMetadata } from '@/lib/site-metadata';

import { cn } from '@/lib/utils';
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
        icon: <Home className="bd-size-1/2" />,
      },
      {
        name: 'Craft',
        slug: '/craft',
        icon: <Pickaxe className="bd-size-1/2" />,
        disabled: true,
      },
      {
        name: 'Article',
        slug: '/article',
        icon: <Layers className="bd-size-1/2" />,
      },
      {
        name: 'Projects',
        slug: '/projects',
        icon: <Package className="bd-size-1/2" />,
        disabled: true,
      },
      {
        name: 'Photos',
        slug: '/photo',
        icon: <Camera className="bd-size-1/2" />,
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
        icon: <Github className="bd-size-1/2" />,
      },
      {
        name: 'YouTube',
        href: siteMetadata.youtube,
        icon: <Youtube className="bd-size-1/2" />,
      },
      {
        name: 'Mail',
        href: `mailto:${siteMetadata.email}`,
        icon: <Mail className="bd-size-1/2" />,
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
      <div className="bd-itesm-end sm bd-flex bd-size-full bd-gap-2 bd-overflow-x-auto bd-overflow-y-hidden bd-py-2">
        {items.map((section, index) => {
          const isLastSection = index === items.length - 1;

          return (
            <>
              {section.items.map(item => {
                if ('slug' in item) {
                  return (
                    <Link
                      title={item.name}
                      key={item.slug}
                      href={item.slug}
                      tabIndex={item.disabled ? -1 : undefined}
                      aria-disabled={item.disabled}
                      className={cn(
                        'bd-relative bd-top-0 bd-flex bd-min-h-10 bd-min-w-10 bd-items-center bd-justify-center bd-rounded-full bd-bg-input bd-text-primary/30 hover:bd-text-primary/40',
                        {
                          'bd-pointer-events-none bd-opacity-50': item.disabled,
                        }
                      )}
                    >
                      <div className="bd-contents">{item.icon}</div>
                    </Link>
                  );
                }

                if ('href' in item) {
                  return (
                    <ExternalLink
                      title={item.name}
                      key={item.href}
                      href={item.href}
                      className="bd-relative bd-top-0 bd-flex bd-min-h-10 bd-min-w-10 bd-items-center bd-justify-center bd-rounded-full bd-bg-input bd-text-primary/30 hover:bd-text-primary/40"
                    >
                      {item.icon}
                    </ExternalLink>
                  );
                }

                return item.children;
              })}
              {!isLastSection && (
                <Separator
                  orientation="vertical"
                  className="bd-mx-2 bd-h-9"
                  style={{
                    maskImage:
                      'linear-gradient(0deg, transparent, rgb(255, 255, 255) 16px, rgb(255, 255, 255) calc(100% - 16px), transparent)',
                  }}
                />
              )}
            </>
          );
        })}
      </div>
    </>
  );
}
