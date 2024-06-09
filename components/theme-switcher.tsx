'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';

export function ThemeSwitcher() {
  const { setTheme, resolvedTheme, theme } = useTheme();
  const isSystemDark = resolvedTheme === 'dark';

  return (
    <button
      title="Toggle Theme"
      className="bd-relative bd-flex bd-size-full bd-items-center bd-justify-center"
      onClick={() => setTheme(isSystemDark ? 'light' : 'dark')}
    >
      <motion.div
        tabIndex={-1}
        initial={false}
        animate={{
          rotate: isSystemDark ? 0 : 45,
        }}
        className="bd-absolute bd-inset-0 bd-flex bd-items-center bd-justify-center"
      >
        {isSystemDark ? (
          <Sun className="bd-size-1/2" />
        ) : (
          <Moon className="bd-size-1/2 -bd-rotate-45" />
        )}
      </motion.div>
      <span className="bd-sr-only">Toggle theme</span>
    </button>
  );
}
