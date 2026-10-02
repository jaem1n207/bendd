import { DockPressState } from '@/components/navigation/consts/dock';
import { isDockKeyboardInput } from '@/components/navigation/lib/dock-input';

interface DockPress {
  item: HTMLElement;
  control: HTMLElement;
  pointerId: number;
}

export function createDockPress(root: HTMLElement) {
  let press: DockPress | null = null;
  let cancelled: HTMLElement | null = null;

  const inside = (control: HTMLElement, event: PointerEvent) => {
    const rect = control.getBoundingClientRect();
    return (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  };
  const cancel = (state = DockPressState.Cancelled) => {
    if (!press) {
      return;
    }
    press.item.dataset.dockPress = state;
    cancelled = press.control;
    press = null;
  };
  const reset = () => {
    cancel();
    for (const item of root.querySelectorAll<HTMLElement>(
      '[data-dock-press]'
    )) {
      item.dataset.dockPress = DockPressState.Cancelled;
    }
  };
  const down = (event: PointerEvent) => {
    if (event.button !== 0 || event.isPrimary === false) {
      return;
    }
    const control =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('a[href], button:not(:disabled)')
        : null;
    const item = control?.closest<HTMLElement>('[data-navigation-item]');
    if (!control || !item || !root.contains(item)) {
      return;
    }
    if (control.getAttribute('aria-disabled') === 'true') {
      return;
    }
    cancel();
    cancelled = null;
    press = { item, control, pointerId: event.pointerId };
    item.dataset.dockPress = DockPressState.Pressed;
  };
  const move = (event: PointerEvent) => {
    if (
      press &&
      press.pointerId === event.pointerId &&
      !inside(press.control, event)
    ) {
      cancel(DockPressState.Released);
    }
  };
  const up = (event: PointerEvent) => {
    if (!press || press.pointerId !== event.pointerId) {
      return;
    }
    if (!inside(press.control, event)) {
      cancel(DockPressState.Released);
      return;
    }
    press.item.dataset.dockPress = DockPressState.Released;
    press = null;
  };
  const pointerCancel = (event: PointerEvent) => {
    if (press?.pointerId === event.pointerId) {
      cancel();
    }
  };
  const click = (event: MouseEvent) => {
    if (
      event.detail === 0 ||
      !(event.target instanceof Node) ||
      !cancelled?.contains(event.target)
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  };
  const keyboard = (event: KeyboardEvent) => {
    if (isDockKeyboardInput(event)) {
      reset();
    }
  };
  const visibility = () => {
    if (document.visibilityState === 'hidden') {
      reset();
    }
  };

  root.addEventListener('pointerdown', down);
  root.addEventListener('click', click, true);
  root.addEventListener('contextmenu', reset);
  document.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerup', up, true);
  document.addEventListener('pointercancel', pointerCancel, true);
  document.addEventListener('pointerleave', reset);
  document.addEventListener('keydown', keyboard, true);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('blur', reset);

  return () => {
    reset();
    root.removeEventListener('pointerdown', down);
    root.removeEventListener('click', click, true);
    root.removeEventListener('contextmenu', reset);
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up, true);
    document.removeEventListener('pointercancel', pointerCancel, true);
    document.removeEventListener('pointerleave', reset);
    document.removeEventListener('keydown', keyboard, true);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('blur', reset);
  };
}
