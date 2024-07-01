import { track } from '@vercel/analytics';
import { useTheme } from 'next-themes';
import { useEffect } from 'react';

export function useThemeManager() {
  const { setTheme, resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === 'dark';

  useEffect(() => {
    track('preferred_theme', {
      theme: resolvedTheme ?? 'system',
    });

    // 테마가 변경되면 giscus iframe을 찾아서 테마 변경을 요청합니다.
    // https://github.com/giscus/giscus/blob/main/ADVANCED-USAGE.md#isetconfigmessage
    const iframe = document.querySelector<HTMLIFrameElement>(
      'iframe.giscus-frame'
    );
    iframe?.contentWindow?.postMessage(
      { giscus: { setConfig: { theme: isDarkTheme ? 'dark' : 'light' } } },
      'https://giscus.app'
    );
  }, [resolvedTheme, isDarkTheme]);

  const toggleTheme = () => {
    setTheme(isDarkTheme ? 'light' : 'dark');
  };

  return { isDarkTheme, toggleTheme };
}
