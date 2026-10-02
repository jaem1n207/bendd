import { DockInput } from '@/components/navigation/consts/dock';

const MODIFIER_KEYS = new Set(['Alt', 'Control', 'Meta', 'Shift']);

export function isDockKeyboardInput(event: KeyboardEvent) {
  return (
    !event.metaKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !MODIFIER_KEYS.has(event.key)
  );
}

/** 포커스를 유지하면서 마지막 입력 방식에 맞게 윤곽선만 표시한다. */
export function trackDockInput(root: HTMLElement, initial = DockInput.Pointer) {
  root.dataset.dockInput = initial;
  const pointer = () => {
    root.dataset.dockInput = DockInput.Pointer;
  };
  const keyboard = (event: KeyboardEvent) => {
    if (!isDockKeyboardInput(event)) {
      return;
    }
    root.dataset.dockInput = DockInput.Keyboard;
  };
  document.addEventListener('pointerdown', pointer, true);
  document.addEventListener('keydown', keyboard, true);
  return () => {
    document.removeEventListener('pointerdown', pointer, true);
    document.removeEventListener('keydown', keyboard, true);
  };
}
