'use client';

import { Moon, Sun } from 'lucide-react';
import { flushSync } from 'react-dom';
import useMeasure from 'react-use-measure';

import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { ClientGate } from '../client-gate';
import { useThemeManager } from './use-theme-manger';

export function ThemeSwitcher() {
  const { isDarkTheme, toggleTheme } = useThemeManager();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [buttonRef, bounds] = useMeasure();

  const handleToggleTheme = async () => {
    if (!buttonRef || !document.startViewTransition || prefersReducedMotion) {
      toggleTheme();
      return;
    }

    await document.startViewTransition(() => {
      flushSync(() => {
        toggleTheme();
      });
    }).ready;

    const { top, left, width, height } = bounds;
    const x = left + width / 2;
    const y = top + height / 2;
    const right = window.innerWidth - left;
    const bottom = window.innerHeight - top;
    const maxRadius = Math.hypot(Math.max(left, right), Math.max(top, bottom));

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 600,
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)',
      }
    );
  };

  return (
    <button
      ref={buttonRef}
      title="Toggle Theme"
      className="bd-relative bd-flex bd-size-full bd-items-center bd-justify-center bd-text-gray-950 bd-transition-transform hover:bd-scale-105"
      onClick={handleToggleTheme}
    >
      <ClientGate>
        {isDarkTheme ? (
          <Sun className="bd-size-1/2" />
        ) : (
          <Moon className="bd-size-1/2" />
        )}
      </ClientGate>
      <span className="bd-sr-only">테마 전환</span>
    </button>
  );
}
