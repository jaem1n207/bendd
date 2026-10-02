import {
  DOCK_DEFAULT_SIZE,
  DOCK_INITIAL_SIZE_PROPERTY,
  DOCK_MAX_SIZE,
  DOCK_MIN_SIZE,
  DOCK_STORAGE_KEY,
} from '@/components/navigation/consts/dock';

export const DOCK_INITIAL_SIZE_STYLE = `var(${DOCK_INITIAL_SIZE_PROPERTY}, ${DOCK_DEFAULT_SIZE}px)`;

// React가 시작되기 전에 검증한 숫자만 CSS에 전달한다.
export const DOCK_INITIAL_SIZE_SCRIPT = `(() => {
  let size = ${DOCK_DEFAULT_SIZE};
  try {
    const saved = JSON.parse(localStorage.getItem(${JSON.stringify(DOCK_STORAGE_KEY)}) || 'null');
    const value = saved?.state?.size;
    if (typeof value === 'number' && Number.isFinite(value)) {
      size = Math.max(${DOCK_MIN_SIZE}, Math.min(${DOCK_MAX_SIZE}, value));
    }
  } catch {}
  document.documentElement.style.setProperty(${JSON.stringify(DOCK_INITIAL_SIZE_PROPERTY)}, size + 'px');
})();`;
