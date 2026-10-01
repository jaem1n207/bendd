import { cva } from 'class-variance-authority';
import { type Route } from 'next';

import { SoundSwitcher } from '@/components/sound';
import { ThemeSwitcher } from '@/components/theme';
import { Book, Bulb, GitHub, Home, Mail, Youtube } from '@/components/ui/icons';
import { DockSeparator } from '@/components/navigation/ui/dock-separator';
import { siteMetadata } from '@/lib/site-metadata';
import { NavigationAnimateTrigger } from '@/components/navigation/ui/navigation-animate-trigger';
import {
  MainNavigationItem,
  SettingNavigationItem,
  SocialNavigationItem,
} from '@/components/navigation/ui/navigation-items';

export function Navigation() {
  return (
    <>
      <NavigationAnimateTrigger>
        {mainItems.map(item => {
          return (
            <MainNavigationItem
              key={item.name}
              slug={item.slug}
              name={item.name}
              icon={item.icon}
            />
          );
        })}
        <DockSeparator />
        {socialItems.map(item => (
          <SocialNavigationItem
            key={item.name}
            href={item.href}
            name={item.name}
            icon={item.icon}
          />
        ))}
        <DockSeparator />
        {settingsItems.map(item => (
          <SettingNavigationItem key={item.name} name={item.name}>
            {item.children}
          </SettingNavigationItem>
        ))}
      </NavigationAnimateTrigger>
    </>
  );
}

const navigationItemSvg = cva('size-1/2 text-gray-950');

const mainItems = [
  {
    name: 'Home',
    slug: '/',
    icon: <Home className={navigationItemSvg()} />,
  },
  {
    name: 'Craft',
    slug: '/craft',
    icon: <Bulb className={navigationItemSvg()} />,
  },
  {
    name: 'Article',
    slug: '/article',
    icon: <Book className={navigationItemSvg()} />,
  },
] satisfies { name: string; slug: Route; icon: React.ReactNode }[];

const socialItems = [
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
];

const settingsItems = [
  {
    name: 'Toggle theme',
    children: <ThemeSwitcher />,
  },
  {
    name: 'Toggle sound',
    children: <SoundSwitcher />,
  },
];
