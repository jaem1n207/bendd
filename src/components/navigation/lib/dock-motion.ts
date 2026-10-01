import {
  DOCK_REST_THRESHOLD,
  DockInput,
  DockMotionMode,
} from '@/components/navigation/consts/dock';
import { stepDockSpring } from '@/components/navigation/lib/dock-geometry';

export interface DockTooltipState {
  name: string;
  index: number;
  direction: number;
  input: DockInput;
}

/** 공유 툴팁의 위치만 움직인다. 아이콘 크기와 좌표는 레이아웃이 소유한다. */
export function createDockMotion({
  root,
  mode,
  tooltipId,
  onTooltip,
}: {
  root: HTMLElement;
  mode: DockMotionMode;
  tooltipId: string;
  onTooltip: (tooltip: DockTooltipState | null) => void;
}) {
  const rail = root.querySelector<HTMLElement>('[data-dock-rail]');
  const viewport = root.querySelector<HTMLElement>('[data-dock-viewport]');
  const tooltip = root.querySelector<HTMLElement>('[data-dock-tooltip]');
  if (!rail || !viewport || !tooltip) {
    return () => {};
  }
  let items: HTMLElement[] = [];
  let centers: number[] = [];
  let active = -1;
  let input = DockInput.Static;
  let tooltipX = 0;
  let velocity = 0;
  let frame = 0;
  let previousTime = 0;

  const draw = () => {
    tooltip.style.transform = `translate3d(${tooltipX}px, 0, 0)`;
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    velocity = 0;
    root.dataset.dockAnimating = 'false';
  };
  const animate = (time: number) => {
    if (active < 0) {
      stop();
      return;
    }
    const seconds = previousTime
      ? Math.min((time - previousTime) / 1000, 0.064)
      : 1 / 60;
    previousTime = time;
    const target = centers[active];
    const next = stepDockSpring(tooltipX, velocity, target, seconds);
    const settled =
      Math.abs(next.value - target) < DOCK_REST_THRESHOLD &&
      Math.abs(next.velocity) < DOCK_REST_THRESHOLD;
    tooltipX = settled ? target : next.value;
    velocity = next.velocity;
    draw();
    if (settled) {
      stop();
      return;
    }
    frame = requestAnimationFrame(animate);
  };
  const clearDescription = (item: HTMLElement | undefined) => {
    const control = item?.querySelector('a, button');
    if (!control) {
      return;
    }
    const ids = (control.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter(id => id && id !== tooltipId);
    if (ids.length) {
      control.setAttribute('aria-describedby', ids.join(' '));
    } else {
      control.removeAttribute('aria-describedby');
    }
  };
  const select = (index: number, nextInput: DockInput) => {
    if (index === active && nextInput === input) {
      return;
    }
    const direction = index >= active ? 1 : -1;
    const initial = active < 0;
    items[active]?.removeAttribute('data-dock-active');
    clearDescription(items[active]);
    active = index;
    input = nextInput;
    const item = items[index];
    if (!item) {
      stop();
      onTooltip(null);
      return;
    }
    item.setAttribute('data-dock-active', '');
    const control = item.querySelector('a, button');
    const description = control?.getAttribute('aria-describedby') ?? '';
    control?.setAttribute(
      'aria-describedby',
      `${description} ${tooltipId}`.trim()
    );
    if (
      initial ||
      nextInput !== DockInput.Pointer ||
      mode === DockMotionMode.Static
    ) {
      stop();
      tooltipX = centers[index];
      draw();
    } else if (!frame) {
      root.dataset.dockAnimating = 'true';
      frame = requestAnimationFrame(animate);
    }
    onTooltip({ name: item.dataset.dockLabel ?? '', index, direction, input });
  };
  const measure = () => {
    // rail 밖 고정 손잡이도 같은 root 좌표계에서 측정한다.
    items = Array.from(
      root.querySelectorAll<HTMLElement>('[data-navigation-item]')
    );
    const left = root.getBoundingClientRect().left;
    centers = items.map(item => {
      const rect = item.getBoundingClientRect();
      return rect.left - left + rect.width / 2;
    });
    const overflow = rail.offsetWidth > viewport.clientWidth + 1;
    root.dataset.dockOverflow = String(overflow);
    stop();
    if (active >= 0) {
      tooltipX = centers[active];
      draw();
    }
  };
  const move = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || root.dataset.dockResizing === 'true') {
      return;
    }
    const target =
      event.target instanceof Element
        ? event.target.closest('[data-navigation-item]')
        : null;
    let index = items.findIndex(item => item === target);
    if (index < 0) {
      const x = event.clientX - root.getBoundingClientRect().left;
      index = centers.reduce(
        (nearest, center, candidate) =>
          Math.abs(center - x) < Math.abs(centers[nearest] - x)
            ? candidate
            : nearest,
        0
      );
    }
    select(index, DockInput.Pointer);
  };
  const leave = () => select(-1, DockInput.Static);
  const keydown = (event: KeyboardEvent) => {
    if (
      ![
        'Tab',
        'Escape',
        'Enter',
        ' ',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Home',
        'End',
      ].includes(event.key)
    ) {
      return;
    }
    if (event.key === 'Escape') {
      select(-1, DockInput.Keyboard);
      return;
    }
    select(
      items.findIndex(item => item.contains(document.activeElement)),
      DockInput.Keyboard
    );
  };
  const focus = (event: FocusEvent) => {
    if (
      input !== DockInput.Keyboard &&
      event.target instanceof Element &&
      !event.target.matches(':focus-visible')
    ) {
      return;
    }
    select(
      items.findIndex(
        item => event.target instanceof Node && item.contains(event.target)
      ),
      DockInput.Keyboard
    );
  };
  const blur = (event: FocusEvent) => {
    if (
      !(event.relatedTarget instanceof Node) ||
      !root.contains(event.relatedTarget)
    ) {
      leave();
    }
  };
  const touch = (event: PointerEvent) => {
    if (event.pointerType === 'touch') {
      leave();
    }
  };
  const visibility = () => {
    if (document.hidden) {
      leave();
    }
  };
  const resize = new ResizeObserver(measure);
  resize.observe(root);
  resize.observe(rail);
  resize.observe(viewport);
  measure();
  root.addEventListener('pointermove', move);
  root.addEventListener('pointerleave', leave);
  root.addEventListener('pointerdown', touch);
  root.addEventListener('focusin', focus);
  root.addEventListener('focusout', blur);
  document.addEventListener('keydown', keydown, true);
  window.addEventListener('resize', measure);
  window.addEventListener('blur', leave);
  document.addEventListener('visibilitychange', visibility);
  viewport.addEventListener('scroll', measure, { passive: true });

  return () => {
    resize.disconnect();
    stop();
    clearDescription(items[active]);
    items[active]?.removeAttribute('data-dock-active');
    root.removeEventListener('pointermove', move);
    root.removeEventListener('pointerleave', leave);
    root.removeEventListener('pointerdown', touch);
    root.removeEventListener('focusin', focus);
    root.removeEventListener('focusout', blur);
    document.removeEventListener('keydown', keydown, true);
    window.removeEventListener('resize', measure);
    window.removeEventListener('blur', leave);
    document.removeEventListener('visibilitychange', visibility);
    viewport.removeEventListener('scroll', measure);
  };
}
