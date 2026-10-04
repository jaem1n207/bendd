export const ENGAGED_READ_MS = 30_000;
export const READ_PROGRESS_THRESHOLD = 0.75;

export function contentProgress(rect: DOMRect, viewportHeight: number): number {
  if (rect.height <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, (viewportHeight - rect.top) / rect.height));
}

export function isEngagedRead(activeMs: number, progress: number) {
  return activeMs >= ENGAGED_READ_MS && progress >= READ_PROGRESS_THRESHOLD;
}

export function relatedPath(href: string, currentPath: string): string | null {
  try {
    const target = new URL(href, location.origin);
    if (target.origin !== location.origin || target.pathname === currentPath) {
      return null;
    }
    return /^\/(article|craft)\/[^/]+\/?$/.test(target.pathname)
      ? target.pathname
      : null;
  } catch {
    return null;
  }
}
