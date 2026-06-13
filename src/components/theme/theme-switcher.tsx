'use client';

import { Moon, Sun } from 'lucide-react';
import { useRef } from 'react';

import { ClientGate } from '@/components/client-gate';
import { useThemeManager } from '@/components/theme/use-theme-manger';
import {
  canTransitionTheme,
  transitionTheme,
} from '@/components/theme/theme-transition';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

export function ThemeSwitcher() {
  const { isDarkTheme, toggleTheme } = useThemeManager();
  const prefersReducedMotion = usePrefersReducedMotion();
  const isTransitioningRef = useRef(false);

  const handleToggleTheme = () => {
    if (isTransitioningRef.current) return;

    if (prefersReducedMotion || !canTransitionTheme()) {
      toggleTheme();
      return;
    }

    // 테마는 오버레이가 불투명한 순간 즉시 적용되고, opacity 페이드만 보인다.
    // 본문 색을 transition하지 않으므로 전환 후 색 깜빡임이 없고, GPU 컴포지터에서
    // 처리돼 성능 영향이 없다. 본문 애니메이션도 오버레이 아래에서 계속 재생된다.
    isTransitioningRef.current = true;
    transitionTheme({
      nextResolvedTheme: isDarkTheme ? 'light' : 'dark',
      applyTheme: toggleTheme,
      onDone: () => {
        isTransitioningRef.current = false;
      },
    });
  };

  return (
    <button
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
