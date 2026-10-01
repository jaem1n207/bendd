import {
  DOCK_EDGE_SPACE,
  DOCK_REST_THRESHOLD,
  DockInput,
  DockInteraction,
  DockMotionMode,
} from '@/components/navigation/consts/dock';
import {
  getDockOffsets,
  getDockTargets,
  readDockPreferences,
  stepDockSpring,
  type DockPreferences,
} from '@/components/navigation/lib/dock-geometry';

export interface DockTooltipState {
  name: string;
  index: number;
  direction: number;
  input: DockInput;
}

/** 레이아웃은 입력 때 읽고, hover 프레임은 transform만 갱신한다. */
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
  const backdrop = root.querySelector<HTMLElement>('[data-dock-backdrop]');
  const tooltip = root.querySelector<HTMLElement>('[data-dock-tooltip]');
  const hoverArea = root.querySelector<HTMLElement>('[data-dock-hover-area]');
  if (!rail || !viewport || !tooltip) {
    return Object.assign(() => {}, {
      setPreferences: (_: DockPreferences) => {},
      setInteraction: (_: DockInteraction) => {},
    });
  }
  let preferences = readDockPreferences(null);
  let size = preferences.size;
  let interaction = DockInteraction.Idle;
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
  let pointer: number | null = null;

  const tipTarget = () =>
    centers[active] + getDockOffsets(growth)[active] - scrollLeft;
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
    const scale = total && width ? `scaleX(${1 + total / width})` : 'none';
    if (backdrop) {
      backdrop.style.transform = scale;
    }
    if (hoverArea) {
      hoverArea.style.transform = scale;
    }
    if (active >= 0) {
      tooltip.style.transform = `translate3d(${tooltipX}px, ${-Math.max(0, ...growth)}px, 0)`;
    }
  };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    root.dataset.dockAnimating = 'false';
  };
  const reset = () => {
    stop();
    growth = items.map(() => 0);
    velocities = items.map(() => 0);
    targets = items.map(() => 0);
    tooltipVelocity = 0;
    if (active >= 0) {
      tooltipX = tipTarget();
    }
    draw();
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
      onTooltip(null);
      return;
    }
    item.setAttribute('data-dock-active', '');
    const control = item.querySelector('a, button');
    control?.setAttribute(
      'aria-describedby',
      `${control.getAttribute('aria-describedby') ?? ''} ${tooltipId}`.trim()
    );
    if (
      initial ||
      nextInput !== DockInput.Pointer ||
      mode === DockMotionMode.Static
    ) {
      tooltipX = tipTarget();
      tooltipVelocity = 0;
    }
    onTooltip({ name: item.dataset.dockLabel ?? '', index, direction, input });
    draw();
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
      return settled ? targets[index] : Math.max(0, next.value);
    });
    const total = growth.reduce((sum, value) => sum + value, 0);
    if (total > budget && total > 0) {
      growth = growth.map(value => (value * budget) / total);
    }
    if (active >= 0) {
      const target = tipTarget();
      const next = stepDockSpring(tooltipX, tooltipVelocity, target, seconds);
      const settled =
        Math.abs(next.value - target) < DOCK_REST_THRESHOLD &&
        Math.abs(next.velocity) < DOCK_REST_THRESHOLD;
      tooltipX = settled ? target : next.value;
      tooltipVelocity = settled ? 0 : next.velocity;
      moving ||= !settled;
    }
    draw();
    if (moving) {
      frame = requestAnimationFrame(animate);
    } else {
      stop();
    }
  };
  const updateTargets = () => {
    targets = getDockTargets({
      centers,
      size,
      magnification: preferences.magnification,
      pointer: mode === DockMotionMode.Animated && !overflow ? pointer : null,
      budget,
    });
    if (interaction === DockInteraction.Preview) {
      stop();
      growth = [...targets];
      velocities = targets.map(() => 0);
      draw();
      return;
    }
    if (
      !frame &&
      (targets.some((target, index) => target !== growth[index]) ||
        (active >= 0 && tooltipX !== tipTarget()))
    ) {
      root.dataset.dockAnimating = 'true';
      frame = requestAnimationFrame(animate);
    }
  };
  const measure = () => {
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
    size = items[0]?.offsetWidth || preferences.size;
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
    if (interaction === DockInteraction.Preview) {
      pointer = centers[Math.floor(centers.length / 2)] ?? null;
    }
    updateTargets();
  };
  const leave = () => {
    if (interaction !== DockInteraction.Idle) {
      return;
    }
    pointer = null;
    select(-1, DockInput.Static);
    updateTargets();
  };
  const move = (event: PointerEvent) => {
    if (
      event.pointerType === 'touch' ||
      interaction !== DockInteraction.Idle ||
      root.dataset.dockResizing === 'true'
    ) {
      return;
    }
    const element = event.target instanceof Element ? event.target : null;
    if (element?.closest('[data-dock-separator]')) {
      select(-1, DockInput.Static);
      stop();
      velocities = growth.map(() => 0);
      targets = [...growth];
      return;
    }
    pointer = event.clientX - rail.getBoundingClientRect().left;
    const target = element?.closest('[data-navigation-item]');
    const offsets = getDockOffsets(growth);
    let index = items.findIndex(item => item === target);
    if (index < 0 && items.length) {
      const x = pointer;
      index = centers.reduce(
        (nearest, center, candidate) =>
          Math.abs(center + offsets[candidate] - x) <
          Math.abs(centers[nearest] + offsets[nearest] - x)
            ? candidate
            : nearest,
        0
      );
    }
    select(index, DockInput.Pointer);
    updateTargets();
  };
  const keydown = (event: KeyboardEvent) => {
    if (
      interaction !== DockInteraction.Idle ||
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
    pointer = null;
    reset();
    select(
      event.key === 'Escape'
        ? -1
        : items.findIndex(item => item.contains(document.activeElement)),
      DockInput.Keyboard
    );
  };
  const focus = (event: FocusEvent) => {
    if (
      event.target instanceof Element &&
      event.target.closest('[data-dock-separator]')
    ) {
      return;
    }
    if (
      interaction !== DockInteraction.Idle ||
      (input !== DockInput.Keyboard &&
        event.target instanceof Element &&
        !event.target.matches(':focus-visible'))
    ) {
      return;
    }
    pointer = null;
    reset();
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
  const deactivate = () => {
    pointer = null;
    select(-1, DockInput.Static);
    reset();
  };
  const down = (event: PointerEvent) => {
    if (
      event.pointerType === 'touch' ||
      (event.button === 0 &&
        event.target instanceof Element &&
        event.target.closest('[data-dock-separator]'))
    ) {
      deactivate();
    }
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
  root.addEventListener('pointerdown', down);
  root.addEventListener('focusin', focus);
  root.addEventListener('focusout', blur);
  document.addEventListener('keydown', keydown, true);
  window.addEventListener('resize', measure);
  window.addEventListener('blur', deactivate);
  document.addEventListener('visibilitychange', visibility);
  viewport.addEventListener('scroll', measure, { passive: true });
  const dispose = () => {
    resize.disconnect();
    deactivate();
    root.removeEventListener('pointermove', move);
    root.removeEventListener('pointerleave', leave);
    root.removeEventListener('pointerdown', down);
    root.removeEventListener('focusin', focus);
    root.removeEventListener('focusout', blur);
    document.removeEventListener('keydown', keydown, true);
    window.removeEventListener('resize', measure);
    window.removeEventListener('blur', deactivate);
    document.removeEventListener('visibilitychange', visibility);
    viewport.removeEventListener('scroll', measure);
  };
  return Object.assign(dispose, {
    setPreferences(value: DockPreferences) {
      preferences = readDockPreferences(value);
      measure();
    },
    setInteraction(value: DockInteraction) {
      interaction = value;
      deactivate();
      if (value === DockInteraction.Preview) {
        pointer = centers[Math.floor(centers.length / 2)] ?? null;
        updateTargets();
      }
    },
  });
}
