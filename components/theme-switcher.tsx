'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';

export function ThemeSwitcher() {
  const { setTheme, resolvedTheme } = useTheme();
  const isSystemDark = resolvedTheme === 'dark';

  return (
    <Button
      title="Toggle Theme"
      className="bd-relative bd-top-0 bd-flex bd-max-h-10 bd-min-h-10 bd-min-w-10 bd-max-w-10 bd-items-center bd-justify-center !bd-rounded-full !bd-bg-input bd-text-primary/30 hover:!bd-bg-input hover:bd-text-primary/40"
      onClick={() => setTheme(isSystemDark ? 'light' : 'dark')}
    >
      <Sun className="bd-size-1/2 bd-min-h-5 bd-min-w-5 bd-rotate-0 bd-scale-100 bd-transition-all dark:-bd-rotate-90 dark:bd-scale-0" />
      <Moon className="bd-absolute bd-size-1/2 bd-rotate-90 bd-scale-0 bd-transition-all dark:bd-rotate-0 dark:bd-scale-100" />
      <span className="bd-sr-only">Toggle theme</span>
    </Button>
  );
}
