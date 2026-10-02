'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';

import styles from '@/components/home/ui/home-studio.module.css';

const stores = [
  {
    name: 'Chrome 및 Chromium',
    description: 'Chrome · Brave · Arc · Dia 등',
    href: 'https://chromewebstore.google.com/detail/synchronize-tab-scrolling/phceoocamipnafpgnchbfhkdlbleeafc',
  },
  {
    name: 'Firefox',
    description: 'Firefox Add-ons',
    href: 'https://addons.mozilla.org/firefox/addon/synchronize-tab-scrolling/',
  },
  {
    name: 'Microsoft Edge',
    description: 'Edge Add-ons',
    href: 'https://microsoftedge.microsoft.com/addons/detail/synchronize-tab-scrolling/jonclaakmpjodjggkadldgkapccdofnn',
  },
];

export function ExtensionInstallMenu() {
  const [animate, setAnimate] = useState(false);

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        className={styles.installTrigger}
        onPointerDown={() => setAnimate(true)}
        onKeyDown={() => setAnimate(false)}
      >
        브라우저에 추가
        <ChevronDown aria-hidden="true" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={styles.installMenu}
          data-motion={animate ? 'animated' : 'immediate'}
          onKeyDown={() => setAnimate(false)}
          align="start"
          sideOffset={8}
          collisionPadding={16}
          aria-label="설치할 브라우저"
        >
          <DropdownMenu.Label className={styles.installLabel}>
            사용하는 브라우저를 선택하세요
          </DropdownMenu.Label>
          {stores.map(store => (
            <DropdownMenu.Item key={store.name} asChild>
              <a
                className={styles.installItem}
                href={store.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>
                  <strong>{store.name}</strong>
                  <small>{store.description}</small>
                </span>
                <ArrowUpRight aria-hidden="true" />
              </a>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className={styles.installSeparator} />
          <p className={styles.installNote}>Safari는 지원하지 않습니다.</p>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
