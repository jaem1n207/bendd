// 숨겨진 탭과 포커스가 없는 창의 시간은 제외해요.
export function startVisibleTimer(
  duration: number,
  onElapsed: () => void,
  canRun: () => boolean = () => true
) {
  let remaining = duration;
  let startedAt: number | null = null;
  let timeout: number | undefined;
  let done = false;

  const pause = () => {
    window.clearTimeout(timeout);
    timeout = undefined;
    if (startedAt !== null) {
      remaining = Math.max(0, remaining - (performance.now() - startedAt));
      startedAt = null;
    }
  };
  const sync = () => {
    pause();
    if (
      done ||
      document.visibilityState !== 'visible' ||
      !document.hasFocus() ||
      !canRun()
    ) {
      return;
    }
    startedAt = performance.now();
    timeout = window.setTimeout(() => {
      pause();
      done = true;
      onElapsed();
    }, remaining);
  };

  document.addEventListener('visibilitychange', sync);
  window.addEventListener('focus', sync);
  window.addEventListener('blur', pause);
  sync();

  return {
    sync,
    dispose: () => {
      done = true;
      pause();
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('blur', pause);
    },
  };
}
