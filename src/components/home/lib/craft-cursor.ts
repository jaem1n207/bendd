const POINTER_QUERY = '(hover: hover) and (pointer: fine)';
const SCOPE_SELECTOR = '[data-craft-cursor]';
const RESIZE_SELECTOR = '[data-dock-separator]';
const DRAG_LABEL = '크기 조절 중';
const RESIZE_LABEL = '위아래로 끌어 크기 조절 · 우클릭해 설정';

enum CraftDragCursor {
  Vertical = 'ns-resize',
  Horizontal = 'ew-resize',
}

export interface CraftCursorState {
  visible: boolean;
  label: string;
}

/** 작품과 해당 Dock 설정에 안내 배지를 연결한다. */
export function createCraftCursor({
  root,
  onState,
  onMove,
}: {
  root: HTMLElement;
  onState: (state: CraftCursorState) => void;
  onMove: (x: number, y: number) => void;
}) {
  const media = window.matchMedia(POINTER_QUERY);
  const page = document.documentElement;
  let state: CraftCursorState = { visible: false, label: '' };
  let activeScope: HTMLElement | null = null;
  let previousActive: string | undefined;
  let gesture: {
    pointer: number;
    scope: HTMLElement;
    label: string;
    cursor: CraftDragCursor;
  } | null = null;
  let point: { x: number; y: number } | null = null;
  const previousDrag = page.dataset.craftCursorDragging;

  const scopeFor = (target: Element) => {
    const scope = target.closest<HTMLElement>(SCOPE_SELECTOR);
    if (scope && root.contains(scope)) {
      return scope;
    }

    const handle = root.querySelector<HTMLElement>(
      `${RESIZE_SELECTOR}[aria-controls]`
    );
    const id = handle?.getAttribute('aria-controls');
    const panel = id ? document.getElementById(id) : null;
    return panel?.contains(target) ? panel : null;
  };

  const restoreScope = () => {
    if (!activeScope) {
      return;
    }
    if (previousActive === undefined) {
      delete activeScope.dataset.craftCursorActive;
    } else {
      activeScope.dataset.craftCursorActive = previousActive;
    }
    activeScope = null;
  };

  const restoreDrag = () => {
    if (previousDrag === undefined) {
      delete page.dataset.craftCursorDragging;
    } else {
      page.dataset.craftCursorDragging = previousDrag;
    }
  };

  const show = (scope: HTMLElement | null, label = state.label) => {
    if (activeScope !== scope) {
      restoreScope();
      if (scope) {
        previousActive = scope.dataset.craftCursorActive;
        scope.dataset.craftCursorActive = 'true';
        activeScope = scope;
      }
    }

    const visible = scope !== null;
    if (state.visible === visible && state.label === label) {
      return;
    }
    state = { visible, label };
    onState(state);
  };

  const labelFor = (target: Element, scope: HTMLElement) => {
    const resize = target.closest(RESIZE_SELECTOR);
    if (resize && scope.contains(resize)) {
      return RESIZE_LABEL;
    }

    const action = target.closest<HTMLElement>('[data-cursor-label]');
    if (action && scope.contains(action)) {
      return action.matches(':disabled')
        ? action.dataset.cursorDisabledLabel ?? '현재 사용할 수 없습니다'
        : action.dataset.cursorLabel ?? '';
    }

    if (target instanceof HTMLInputElement && target.type === 'range') {
      const name = target.labels?.[0]?.textContent?.trim() ?? '값';
      return `드래그해 ${name} 조절`;
    }
    const button = target.closest('button');
    if (button && scope.contains(button)) {
      return (
        button.getAttribute('aria-label') ?? button.textContent?.trim() ?? ''
      );
    }

    return scope.dataset.craftCursor ?? '설정 값을 조절해 보세요';
  };

  const update = (target: Element | null) => {
    if (!media.matches) {
      show(null);
      return;
    }
    if (gesture) {
      page.dataset.craftCursorDragging = gesture.cursor;
      show(gesture.scope, gesture.label);
      return;
    }
    const scope = target ? scopeFor(target) : null;
    show(scope, target && scope ? labelFor(target, scope) : state.label);
  };

  const refresh = () => {
    if (!point) {
      return;
    }
    onMove(point.x, point.y);
    update(document.elementFromPoint(point.x, point.y));
  };

  const reset = () => {
    gesture = null;
    point = null;
    restoreDrag();
    show(null);
  };

  const move = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || !media.matches) {
      reset();
      return;
    }
    if (gesture && event.pointerId !== gesture.pointer) {
      return;
    }
    point = { x: event.clientX, y: event.clientY };
    onMove(point.x, point.y);
    update(event.target instanceof Element ? event.target : null);
  };

  const out = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') {
      reset();
      return;
    }
    if (gesture) {
      return;
    }
    update(event.relatedTarget instanceof Element ? event.relatedTarget : null);
  };

  const down = (event: PointerEvent) => {
    if (
      event.pointerType !== 'mouse' ||
      gesture !== null ||
      !media.matches ||
      !event.isPrimary ||
      event.button !== 0 ||
      !(event.target instanceof Element)
    ) {
      return;
    }
    const handle = event.target.closest(RESIZE_SELECTOR);
    const range =
      event.target instanceof HTMLInputElement && event.target.type === 'range'
        ? event.target
        : null;
    const scope = scopeFor(event.target);
    if ((!handle && !range) || !scope) {
      return;
    }
    const name = range?.labels?.[0]?.textContent?.trim() ?? '값';
    gesture = {
      pointer: event.pointerId,
      scope,
      label: handle ? DRAG_LABEL : `${name} 조절 중`,
      cursor: handle ? CraftDragCursor.Vertical : CraftDragCursor.Horizontal,
    };
    move(event);
  };

  const up = (event: PointerEvent) => {
    if (event.pointerId !== gesture?.pointer) {
      return;
    }
    gesture = null;
    restoreDrag();
    point = { x: event.clientX, y: event.clientY };
    refresh();
  };

  const cancel = (event: PointerEvent) => {
    if (event.pointerId === gesture?.pointer) {
      reset();
    }
  };

  const visibility = () => {
    if (document.hidden) {
      reset();
    }
  };

  const keydown = (event: KeyboardEvent) => {
    if (gesture && event.key !== 'Escape') {
      return;
    }
    reset();
  };

  document.addEventListener('pointerover', move);
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerout', out);
  document.addEventListener('pointerdown', down, true);
  document.addEventListener('pointerup', up, true);
  document.addEventListener('pointercancel', cancel, true);
  document.addEventListener('lostpointercapture', cancel, true);
  document.addEventListener('keydown', keydown, true);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('blur', reset);
  window.addEventListener('resize', refresh);
  window.addEventListener('scroll', refresh, { capture: true, passive: true });
  media.addEventListener('change', reset);

  const observer = new MutationObserver(refresh);
  observer.observe(root, {
    subtree: true,
    attributes: true,
    attributeFilter: [
      'disabled',
      'aria-controls',
      'data-cursor-label',
      'data-craft-cursor',
    ],
  });

  return () => {
    reset();
    observer.disconnect();
    document.removeEventListener('pointerover', move);
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerout', out);
    document.removeEventListener('pointerdown', down, true);
    document.removeEventListener('pointerup', up, true);
    document.removeEventListener('pointercancel', cancel, true);
    document.removeEventListener('lostpointercapture', cancel, true);
    document.removeEventListener('keydown', keydown, true);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('blur', reset);
    window.removeEventListener('resize', refresh);
    window.removeEventListener('scroll', refresh, true);
    media.removeEventListener('change', reset);
  };
}

const BADGE_EDGE = 12;
const BADGE_OFFSET = { x: 18, y: 26 };

export function getCursorBadgeOffset({
  x,
  y,
  width,
  height,
  viewportWidth,
  viewportHeight,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
}) {
  return {
    x:
      Math.max(
        BADGE_EDGE,
        Math.min(x + BADGE_OFFSET.x, viewportWidth - width - BADGE_EDGE)
      ) - x,
    y:
      Math.max(
        BADGE_EDGE,
        Math.min(y + BADGE_OFFSET.y, viewportHeight - height - BADGE_EDGE)
      ) - y,
  };
}
