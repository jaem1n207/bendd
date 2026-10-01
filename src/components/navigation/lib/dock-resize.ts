import {
  DOCK_MAX_SIZE,
  DOCK_MIN_SIZE,
  DOCK_RESIZE_SENSITIVITY,
  DockInput,
} from '@/components/navigation/consts/dock';
import { clampDockSize } from '@/components/navigation/lib/dock-geometry';

interface ResizeGesture {
  pointer: number;
  handle: HTMLElement;
  touch: boolean;
  startY: number;
  startX: number;
  moved: boolean;
  startSize: number;
  cursor: string;
  selection: string;
}

enum ResizeEnd {
  Commit,
  Cancel,
}

/** 드래그 중에는 DOM만 갱신하고 완료된 크기만 저장 경계에 전달한다. */
export function createDockResize({
  root,
  handles,
  size,
  onCommit,
  onPreview = () => {},
  onOpen = () => {},
}: {
  root: HTMLElement;
  handles: readonly HTMLElement[];
  size: number;
  onCommit: (size: number) => void;
  onPreview?: (size: number) => void;
  onOpen?: (handle: HTMLElement, input: DockInput) => void;
}) {
  let current = clampDockSize(size);
  let pending = current;
  let gesture: ResizeGesture | null = null;
  let frame = 0;
  const page = document.documentElement;
  const outputs = root.querySelectorAll<HTMLElement>('[data-dock-size-output]');

  const draw = (value: number) => {
    current = clampDockSize(value);
    root.style.setProperty('--dock-size', `${current}px`);
    const label = `${Number(current.toFixed(1))}px`;
    handles.forEach(handle => {
      handle.setAttribute('aria-valuenow', String(current));
      handle.setAttribute('aria-valuetext', label);
    });
    outputs.forEach(output => {
      output.textContent = label;
    });
    onPreview(current);
  };
  const flush = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    draw(pending);
  };
  const finish = (reason: ResizeEnd) => {
    const active = gesture;
    if (!active) {
      return;
    }
    // releasePointerCapture에서 발생하는 lostpointercapture의 재진입을 막는다.
    gesture = null;
    cancelAnimationFrame(frame);
    frame = 0;
    draw(reason === ResizeEnd.Commit ? pending : active.startSize);
    delete root.dataset.dockResizing;
    page.style.cursor = active.cursor;
    page.style.userSelect = active.selection;
    if (active.handle.hasPointerCapture(active.pointer)) {
      active.handle.releasePointerCapture(active.pointer);
    }
    if (reason === ResizeEnd.Commit && current !== active.startSize) {
      onCommit(current);
    }
  };
  const cancel = () => finish(ResizeEnd.Cancel);
  const getSize = (y: number) =>
    gesture
      ? clampDockSize(
          gesture.startSize + (gesture.startY - y) * DOCK_RESIZE_SENSITIVITY
        )
      : current;
  const down = (event: PointerEvent) => {
    if (gesture || !event.isPrimary || event.button !== 0) {
      return;
    }
    const handle = event.currentTarget;
    if (!(handle instanceof HTMLElement)) {
      return;
    }
    event.preventDefault();
    handle.focus({ preventScroll: true });
    handle.setPointerCapture(event.pointerId);
    gesture = {
      pointer: event.pointerId,
      handle,
      touch: event.pointerType === 'touch',
      startY: event.clientY,
      startX: event.clientX,
      moved: false,
      startSize: current,
      cursor: page.style.cursor,
      selection: page.style.userSelect,
    };
    pending = current;
    root.dataset.dockResizing = 'true';
    page.style.cursor = 'ns-resize';
    page.style.userSelect = 'none';
  };
  const move = (event: PointerEvent) => {
    if (event.pointerId !== gesture?.pointer) {
      return;
    }
    if (
      gesture &&
      Math.hypot(
        event.clientX - gesture.startX,
        event.clientY - gesture.startY
      ) >= 3
    ) {
      gesture.moved = true;
    }
    pending = getSize(event.clientY);
    if (!frame) {
      frame = requestAnimationFrame(flush);
    }
  };
  const up = (event: PointerEvent) => {
    if (event.pointerId !== gesture?.pointer) {
      return;
    }
    const active = gesture;
    const tapped =
      active &&
      !active.moved &&
      Math.hypot(event.clientX - active.startX, event.clientY - active.startY) <
        3;
    pending = tapped ? active.startSize : getSize(event.clientY);
    finish(ResizeEnd.Commit);
    if (tapped && active.touch) {
      onOpen(active.handle, DockInput.Pointer);
    }
  };
  const lost = (event: PointerEvent) => {
    if (event.pointerId === gesture?.pointer) {
      cancel();
    }
  };
  const escape = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && gesture) {
      event.preventDefault();
      cancel();
    }
  };
  const keydown = (event: KeyboardEvent) => {
    if (
      event.key === 'Enter' ||
      event.key === ' ' ||
      (event.key === 'F10' && event.shiftKey)
    ) {
      event.preventDefault();
      cancel();
      if (event.currentTarget instanceof HTMLElement) {
        onOpen(event.currentTarget, DockInput.Keyboard);
      }
      return;
    }
    const values: Record<string, number> = {
      ArrowUp: current + 1,
      ArrowRight: current + 1,
      ArrowDown: current - 1,
      ArrowLeft: current - 1,
      Home: DOCK_MIN_SIZE,
      End: DOCK_MAX_SIZE,
    };
    if (!(event.key in values)) {
      return;
    }
    event.preventDefault();
    if (gesture) {
      return;
    }
    const next = clampDockSize(values[event.key]);
    if (next !== current) {
      draw(next);
      onCommit(current);
    }
  };

  const contextMenu = (event: MouseEvent) => {
    event.preventDefault();
    cancel();
    if (event.currentTarget instanceof HTMLElement) {
      onOpen(event.currentTarget, DockInput.Pointer);
    }
  };
  draw(current);
  handles.forEach(handle => {
    handle.addEventListener('pointerdown', down);
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', lost);
    handle.addEventListener('lostpointercapture', lost);
    handle.addEventListener('keydown', keydown);
    handle.addEventListener('contextmenu', contextMenu);
  });
  document.addEventListener('keydown', escape, true);
  window.addEventListener('blur', cancel);

  return {
    setSize(value: number) {
      cancel();
      draw(value);
    },
    dispose() {
      cancel();
      handles.forEach(handle => {
        handle.removeEventListener('pointerdown', down);
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', lost);
        handle.removeEventListener('lostpointercapture', lost);
        handle.removeEventListener('keydown', keydown);
        handle.removeEventListener('contextmenu', contextMenu);
      });
      document.removeEventListener('keydown', escape, true);
      window.removeEventListener('blur', cancel);
    },
  };
}
