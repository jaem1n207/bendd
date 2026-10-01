import {
  DOCK_DEFAULT_SIZE,
  DOCK_MAX_SIZE,
  DOCK_MIN_SIZE,
  DOCK_RESIZE_SENSITIVITY,
} from '@/components/navigation/consts/dock';
import { clampDockSize } from '@/components/navigation/lib/dock-geometry';

interface ResizeGesture {
  pointer: number;
  startY: number;
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
  handle,
  size,
  onCommit,
}: {
  root: HTMLElement;
  handle: HTMLElement;
  size: number;
  onCommit: (size: number) => void;
}) {
  let current = clampDockSize(size);
  let pending = current;
  let gesture: ResizeGesture | null = null;
  let frame = 0;
  const page = document.documentElement;
  const output = root.querySelector<HTMLElement>('[data-dock-size-output]');

  const draw = (value: number) => {
    current = clampDockSize(value);
    root.style.setProperty('--dock-size', `${current}px`);
    handle.setAttribute('aria-valuenow', String(current));
    const label = `${Number(current.toFixed(1))}px`;
    handle.setAttribute('aria-valuetext', label);
    if (output) {
      output.textContent = label;
    }
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
    if (handle.hasPointerCapture(active.pointer)) {
      handle.releasePointerCapture(active.pointer);
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
    event.preventDefault();
    handle.focus({ preventScroll: true });
    handle.setPointerCapture(event.pointerId);
    gesture = {
      pointer: event.pointerId,
      startY: event.clientY,
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
    pending = getSize(event.clientY);
    if (!frame) {
      frame = requestAnimationFrame(flush);
    }
  };
  const up = (event: PointerEvent) => {
    if (event.pointerId !== gesture?.pointer) {
      return;
    }
    pending = getSize(event.clientY);
    finish(ResizeEnd.Commit);
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
    const values: Record<string, number> = {
      ArrowUp: current + 1,
      ArrowRight: current + 1,
      ArrowDown: current - 1,
      ArrowLeft: current - 1,
      Home: DOCK_MIN_SIZE,
      End: DOCK_MAX_SIZE,
      Enter: DOCK_DEFAULT_SIZE,
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

  draw(current);
  handle.addEventListener('pointerdown', down);
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', up);
  handle.addEventListener('pointercancel', lost);
  handle.addEventListener('lostpointercapture', lost);
  handle.addEventListener('keydown', keydown);
  document.addEventListener('keydown', escape, true);
  window.addEventListener('blur', cancel);

  return {
    setSize(value: number) {
      cancel();
      draw(value);
    },
    dispose() {
      cancel();
      handle.removeEventListener('pointerdown', down);
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', lost);
      handle.removeEventListener('lostpointercapture', lost);
      handle.removeEventListener('keydown', keydown);
      document.removeEventListener('keydown', escape, true);
      window.removeEventListener('blur', cancel);
    },
  };
}
