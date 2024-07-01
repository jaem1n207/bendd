import { cva } from 'class-variance-authority';

import {
  Book,
  Bulb,
  Gallery,
  GitHub,
  Home,
  Mail,
  Youtube,
} from '@/components/icons';
import { SoundSwitcher } from '@/components/sound-switcher';
import { ThemeSwitcher } from '@/components/theme/theme-switcher';
import { Separator } from '@/components/ui/separator';
import { siteMetadata } from '@/lib/site-metadata';
import { NavigationAnimateTrigger } from './navigation-animate-trigger';
import {
  MainNavigationItem,
  SettingNavigationItem,
  SocialNavigationItem,
} from './navigation-items';

export function Navigation() {
  return (
    <>
      <div className="dark:bd-absolute dark:-bd-top-px dark:-bd-z-10 dark:bd-h-px dark:bd-w-[95%] dark:bd-bg-navigation-highlight dark:bd-opacity-20" />
      <NavigationAnimateTrigger>
        {mainItems.map(item => {
          if (item.disabled) {
            return null;
          }

          return (
            <MainNavigationItem
              key={item.name}
              slug={item.slug}
              name={item.name}
              icon={item.icon}
            />
          );
        })}
        <StyledSeparator />
        {socialItems.map(item => (
          <SocialNavigationItem
            key={item.name}
            href={item.href}
            name={item.name}
            icon={item.icon}
          />
        ))}
        <StyledSeparator />
        {settingsItems.map(item => (
          <SettingNavigationItem key={item.name} name={item.name}>
            {item.children}
          </SettingNavigationItem>
        ))}
      </NavigationAnimateTrigger>
    </>
  );
}

const navigationItemSvg = cva('bd-size-1/2 bd-text-gray-950');

const mainItems = [
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
];

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

function StyledSeparator() {
  return (
    <Separator
      orientation="vertical"
      className="bd-mx-2 !bd-h-9"
      style={{
        maskImage:
          'linear-gradient(0deg, transparent, rgb(255, 255, 255) 16px, rgb(255, 255, 255) calc(100% - 16px), transparent)',
      }}
    />
  );
}
