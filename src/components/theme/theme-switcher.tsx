'use client';

import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';

import { MotionSlot } from '../motion-slot';
import { useThemeManager } from './use-theme-manger';

const MotionSun = motion(Sun);
const MotionMoon = motion(Moon);

export function ThemeSwitcher() {
  const { isDarkTheme, toggleTheme } = useThemeManager();

  return (
    <button
      title="Toggle Theme"
      className="bd-relative bd-flex bd-size-full bd-items-center bd-justify-center bd-text-gray-950"
      onClick={toggleTheme}
    >
      <MotionSlot>
        <MotionSun
          className="bd-block bd-size-1/2 dark:bd-hidden"
          initial={{ rotate: 0 }}
          animate={{
            rotate: isDarkTheme ? -90 : 0,
          }}
        />
      </MotionSlot>
      <MotionSlot>
        <MotionMoon
          className="bd-hidden bd-size-1/2 dark:bd-block"
          initial={{ rotate: 0 }}
          animate={{
            rotate: isDarkTheme ? 0 : 90,
          }}
        />
      </MotionSlot>
      <span className="bd-sr-only">Toggle theme</span>
    </button>
  );
}
