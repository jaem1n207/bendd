'use client';

import { Moon, Sun } from 'lucide-react';
import { useRef } from 'react';

import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { ClientGate } from '../client-gate';
import { canRevealTheme, revealTheme } from './theme-reveal';
import { useThemeManager } from './use-theme-manger';

export function ThemeSwitcher() {
  const { isDarkTheme, toggleTheme } = useThemeManager();
  const prefersReducedMotion = usePrefersReducedMotion();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isRevealingRef = useRef(false);

  const handleToggleTheme = () => {
    if (isRevealingRef.current) return;

    const button = buttonRef.current;
    if (!button || prefersReducedMotion || !canRevealTheme()) {
      toggleTheme();
      return;
    }

    const { top, left, width, height } = button.getBoundingClientRect();

    // 실제 DOM은 옛 테마 그대로 두고(본문 애니메이션 계속 재생) 새 테마 복제본을
    // 버튼 위치에서 원형으로 펼친 뒤, 다 덮이면 실제 테마를 커밋한다.
    isRevealingRef.current = true;
    revealTheme({
      origin: { x: left + width / 2, y: top + height / 2 },
      nextResolvedTheme: isDarkTheme ? 'light' : 'dark',
      onCommit: toggleTheme,
      onFinished: () => {
        isRevealingRef.current = false;
      },
    });
  };

  return (
    <button
      ref={buttonRef}
      title="Toggle Theme"
      className="relative flex size-full items-center justify-center text-gray-950 transition-transform hover:scale-105"
      onClick={handleToggleTheme}
    >
      <ClientGate>
        {isDarkTheme ? (
          <Sun className="size-1/2" />
        ) : (
          <Moon className="size-1/2" />
        )}
      </ClientGate>
      <span className="sr-only">테마 전환</span>
    </button>
  );
}
