type Browser =
  | 'chrome'
  | 'firefox'
  | 'safari'
  | 'edge'
  | 'opera'
  | 'vivaldi'
  | 'unknown';
/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-CH-UA-Platform#platform
 */
export type PlatformHint =
  | 'Android'
  | 'Chrome OS'
  | 'Chromium OS'
  | 'iOS'
  | 'Linux'
  | 'macOS'
  | 'Windows'
  | 'Unknown';

export function getBrowserInfo(userAgent: string | null): Browser {
  if (!userAgent) return 'unknown';

  const ua = userAgent.toLowerCase();

  let browser: Browser = 'unknown';

  const isChromium = ua.includes('chrome') || ua.includes('chromium');
  if (isChromium) {
    if (ua.includes('opr') || ua.includes('opera')) {
      browser = 'opera';
    } else if (ua.includes('edg')) {
      browser = 'edge';
    } else if (ua.includes('vivaldi')) {
      browser = 'vivaldi';
    } else {
      browser = 'chrome';
    }
  } else if (
    ua.includes('firefox') ||
    ua.includes('thunderbird') ||
    ua.includes('librewolf')
  ) {
    browser = 'firefox';
  } else if (ua.includes('safari')) {
    browser = 'safari';
  }

  return browser;
}

export function getPlatformInfo(platformHint: PlatformHint | null) {
  if (!platformHint) return { platform: 'unknown' };

  const cleanedHint = platformHint.replace(/"/g, '');

  const platformMap: Record<PlatformHint, string> = {
    Android: 'android',
    'Chrome OS': 'chromeos',
    'Chromium OS': 'chromiumos',
    iOS: 'ios',
    Linux: 'linux',
    macOS: 'macos',
    Windows: 'windows',
    Unknown: 'unknown',
  };

  return platformMap[cleanedHint as PlatformHint] || 'unknown';
}
