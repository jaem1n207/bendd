'use client';

import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { track } from '@vercel/analytics';
import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect } from 'react';

const MotionSun = motion(Sun);
const MotionMoon = motion(Moon);

export function ThemeSwitcher() {
  const prefersReducedMotion = usePrefersReducedMotion();

  const { setTheme, resolvedTheme } = useTheme();
  const isSystemDark = resolvedTheme === 'dark';

  const handleThemeToggle = () => {
    setTheme(isSystemDark ? 'light' : 'dark');
  };

  useEffect(() => {
    track('preferred_theme', {
      theme: resolvedTheme ?? 'system',
    });
  }, [resolvedTheme]);

  return (
    <button
      title="Toggle Theme"
      className="bd-relative bd-flex bd-size-full bd-items-center bd-justify-center"
      onClick={handleThemeToggle}
    >
      <MotionSun
        className="bd-block bd-size-1/2 dark:bd-hidden"
        initial={{ rotate: 0 }}
        animate={{
          rotate: isSystemDark ? (prefersReducedMotion ? 0 : -90) : 0,
        }}
      />
      <MotionMoon
        className="bd-hidden bd-size-1/2 dark:bd-block"
        initial={{ rotate: 0 }}
        animate={
          prefersReducedMotion && {
            rotate: isSystemDark ? 0 : prefersReducedMotion ? 0 : 90,
          }
        }
      />
      <span className="bd-sr-only">Toggle theme</span>
    </button>
  );
}
