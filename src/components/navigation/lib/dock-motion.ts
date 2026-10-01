import {
  DOCK_EDGE_SPACE,
  DOCK_REST_THRESHOLD,
  DockInput,
  DockMotionMode,
} from '@/components/navigation/consts/dock';
import {
  getDockOffsets,
  getDockTargets,
  stepDockSpring,
} from '@/components/navigation/lib/dock-geometry';

export interface DockTooltipState {
  name: string;
  index: number;
  direction: number;
  input: DockInput;
}

/** 크기 측정은 입력/리사이즈 때만, 프레임에서는 transform만 갱신한다. */
export function createDockMotion({
  root,
  size,
  magnification,
  mode,
  tooltipId,
  onTooltip,
}: {
  root: HTMLElement;
  size: number;
  magnification: number;
  mode: DockMotionMode;
  tooltipId: string;
  onTooltip: (tooltip: DockTooltipState | null) => void;
}) {
  const rail = root.querySelector<HTMLElement>('[data-dock-rail]');
  const viewport = root.querySelector<HTMLElement>('[data-dock-viewport]');
  const backdrop = root.querySelector<HTMLElement>('[data-dock-backdrop]');
  const tooltip = root.querySelector<HTMLElement>('[data-dock-tooltip]');
  const hoverArea = root.querySelector<HTMLElement>('[data-dock-hover-area]');
  if (!rail || !viewport || !backdrop || !tooltip) {
    return () => {};
  }
  let items: HTMLElement[] = [];
  let separators: { element: HTMLElement; preceding: number }[] = [];
  let centers: number[] = [];
  let growth: number[] = [];
  let velocities: number[] = [];
  let targets: number[] = [];
  let width = 0;
  let scrollLeft = 0;
  let budget = 0;
  let frame = 0;
  let previousTime = 0;
  let active = -1;
  let input = DockInput.Static;
  let overflow = false;
  let tooltipX = 0;
  let tooltipVelocity = 0;

  const getTooltipX = () =>
    centers[active] + getDockOffsets(growth)[active] - scrollLeft;

  const positionTooltip = () => {
    if (active < 0) {
      return;
    }
    tooltip.style.transform = `translate3d(${tooltipX}px, ${-Math.max(...growth)}px, 0)`;
  };

  const draw = () => {
    const offsets = getDockOffsets(growth);
    const total = growth.reduce((sum, value) => sum + value, 0);
    items.forEach((item, index) => {
      item.style.transform =
        growth[index] || offsets[index]
          ? `translate3d(${offsets[index]}px, 0, 0) scale(${1 + growth[index] / size})`
          : 'none';
    });
    separators.forEach(({ element, preceding }) => {
      const before = growth
        .slice(0, preceding)
        .reduce((sum, value) => sum + value, 0);
      element.style.transform = `translateX(${before - total / 2}px)`;
    });
    backdrop.style.transform =
      total && width ? `scaleX(${1 + total / width})` : 'none';
    if (hoverArea) {
      hoverArea.style.transform = backdrop.style.transform;
    }
    positionTooltip();
  };

  const reset = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    growth = items.map(() => 0);
    velocities = items.map(() => 0);
    targets = items.map(() => 0);
    root.dataset.dockAnimating = 'false';
    root.dataset.dockHovering = 'false';
    if (active >= 0) {
      tooltipX = getTooltipX();
      tooltipVelocity = 0;
    }
    draw();
  };

  const select = (index: number, nextInput: DockInput) => {
    if (index === active && nextInput === input) {
      return;
    }
    const direction = index >= active ? 1 : -1;
    const previous = items[active];
    const initialSelection = active < 0;
    previous?.removeAttribute('data-dock-active');
    previous
      ?.querySelector('[aria-describedby]')
      ?.removeAttribute('aria-describedby');
    active = index;
    input = nextInput;
    root.dataset.dockHovering = String(
      index >= 0 &&
        nextInput === DockInput.Pointer &&
        mode === DockMotionMode.Animated &&
        !overflow
    );
    const item = items[index];
    if (!item) {
      onTooltip(null);
      return;
    }
    item.setAttribute('data-dock-active', '');
    item
      .querySelector('a, button')
      ?.setAttribute('aria-describedby', tooltipId);
    if (
      initialSelection ||
      nextInput !== DockInput.Pointer ||
      mode === DockMotionMode.Static ||
      overflow
    ) {
      tooltipX = getTooltipX();
      tooltipVelocity = 0;
    }
    onTooltip({ name: item.dataset.dockLabel ?? '', index, direction, input });
    positionTooltip();
  };

  const animate = (time: number) => {
    const seconds = previousTime
      ? Math.min((time - previousTime) / 1000, 0.064)
      : 1 / 60;
    previousTime = time;
    let moving = false;
    growth = growth.map((value, index) => {
      const next = stepDockSpring(
        value,
        velocities[index],
        targets[index],
        seconds
      );
      const settled =
        Math.abs(next.value - targets[index]) < DOCK_REST_THRESHOLD &&
        Math.abs(next.velocity) < DOCK_REST_THRESHOLD;
      velocities[index] = settled ? 0 : next.velocity;
      moving ||= !settled;
      return settled
        ? targets[index]
        : Math.max(0, Math.min(magnification - size, next.value));
    });
    const total = growth.reduce((sum, value) => sum + value, 0);
    if (total > budget && total > 0) {
      growth = growth.map(value => (value * budget) / total);
    }
    if (active >= 0) {
      const targetX = getTooltipX();
      const next = stepDockSpring(tooltipX, tooltipVelocity, targetX, seconds);
      const settled =
        Math.abs(next.value - targetX) < DOCK_REST_THRESHOLD &&
        Math.abs(next.velocity) < DOCK_REST_THRESHOLD;
      tooltipX = settled ? targetX : next.value;
      tooltipVelocity = settled ? 0 : next.velocity;
      moving ||= !settled;
    }
    draw();
    if (moving) {
      frame = requestAnimationFrame(animate);
    } else {
      frame = 0;
      previousTime = 0;
      root.dataset.dockAnimating = 'false';
    }
  };

  const updateTargets = (pointer: number | null) => {
    targets = getDockTargets({ centers, size, magnification, pointer, budget });
    if (
      !frame &&
      (targets.some((target, index) => target !== growth[index]) ||
        (active >= 0 && tooltipX !== getTooltipX()))
    ) {
      root.dataset.dockAnimating = 'true';
      frame = requestAnimationFrame(animate);
    }
  };

  const measure = () => {
    // 스크롤이나 컨텐츠 변경 후에는 현재 DOM에서 다시 읽는다.
    items = Array.from(
      rail.querySelectorAll<HTMLElement>('[data-navigation-item]')
    );
    centers = items.map(item => item.offsetLeft + item.offsetWidth / 2);
    separators = Array.from(
      rail.querySelectorAll<HTMLElement>('[data-dock-separator]')
    ).map(element => ({
      element,
      preceding: items.filter(item => item.offsetLeft < element.offsetLeft)
        .length,
    }));
    width = rail.offsetWidth;
    scrollLeft = viewport.scrollLeft;
    overflow = width > viewport.clientWidth + 1;
    root.dataset.dockOverflow = String(overflow);
    const rect = rail.getBoundingClientRect();
    const boundary = root
      .closest<HTMLElement>('[data-dock-boundary]')
      ?.getBoundingClientRect();
    const left = Math.max(DOCK_EDGE_SPACE, boundary?.left ?? DOCK_EDGE_SPACE);
    const right = Math.min(
      document.documentElement.clientWidth - DOCK_EDGE_SPACE,
      boundary?.right ?? Infinity
    );
    const center = rect.left + width / 2;
    budget = Math.max(0, 2 * Math.min(center - left, right - center) - width);
    reset();
  };

  const move = (event: PointerEvent) => {
    if (event.pointerType === 'touch') {
      return;
    }
    const rect = rail.getBoundingClientRect();
    const pointer = event.clientX - rect.left;
    const offsets = getDockOffsets(growth);
    const target =
      event.target instanceof Element
        ? event.target.closest('[data-navigation-item]')
        : null;
    let index = items.findIndex(item => item === target);
    if (index < 0) {
      index = centers.reduce(
        (nearest, center, candidate) =>
          Math.abs(center + offsets[candidate] - pointer) <
          Math.abs(centers[nearest] + offsets[nearest] - pointer)
            ? candidate
            : nearest,
        0
      );
    }
    select(index, DockInput.Pointer);
    if (mode === DockMotionMode.Animated && !overflow) {
      root.dataset.dockHovering = 'true';
      updateTargets(pointer);
    }
  };

  const leave = () => {
    select(-1, DockInput.Static);
    updateTargets(null);
  };
  const keydown = (event: KeyboardEvent) => {
    if (!['Tab', 'Escape', 'Enter', ' '].includes(event.key)) {
      return;
    }
    reset();
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
    reset();
    const item =
      event.target instanceof Element
        ? event.target.closest('[data-navigation-item]')
        : null;
    select(
      items.findIndex(candidate => candidate === item),
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
      reset();
      select(-1, DockInput.Static);
    }
  };
  const deactivate = () => {
    reset();
    select(-1, DockInput.Static);
  };
  const visibility = () => {
    if (document.hidden) {
      deactivate();
    }
  };
  const resize = new ResizeObserver(measure);
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
  window.addEventListener('blur', deactivate);
  document.addEventListener('visibilitychange', visibility);
  viewport.addEventListener('scroll', measure, { passive: true });

  return () => {
    resize.disconnect();
    reset();
    items[active]
      ?.querySelector('[aria-describedby]')
      ?.removeAttribute('aria-describedby');
    items[active]?.removeAttribute('data-dock-active');
    root.removeEventListener('pointermove', move);
    root.removeEventListener('pointerleave', leave);
    root.removeEventListener('pointerdown', touch);
    root.removeEventListener('focusin', focus);
    root.removeEventListener('focusout', blur);
    document.removeEventListener('keydown', keydown, true);
    window.removeEventListener('resize', measure);
    window.removeEventListener('blur', deactivate);
    document.removeEventListener('visibilitychange', visibility);
    viewport.removeEventListener('scroll', measure);
  };
}
