'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';

import {
  createHomeRevealPlan,
  HOME_NOTE_DELAY,
  HomeViewport,
  type HomeRevealItem,
  type HomeRevealKind,
} from '@/components/home/lib/home-reveal-plan';
import styles from '@/components/home/ui/home-motion.module.css';
import { HOME_REVEAL_COMPLETE } from '@/lib/home-reveal-events';

// Retained across client navigation, reset by a real document load. Keeping this
// local avoids pulling the whole navigation UI into the home's initial bundle.
let hasVisitedHome = false;
const initialEase = 'cubic-bezier(0.25, 0.1, 0.25, 1)';
const noteEase = 'cubic-bezier(0.645, 0.045, 0.355, 1)';
const controlSelector =
  'a[href], button, input, select, textarea, [role="button"], [role="slider"], ' +
  '[role="checkbox"], [role="switch"], [role="tab"], [role="combobox"], ' +
  '[contenteditable]:not([contenteditable="false"])';
const scrollKeys = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' ',
]);
const finalFrame: Keyframe = {
  opacity: 1,
  filter: 'blur(0px)',
  transform: 'translateY(0px)',
};

interface GroupSchedule {
  bodyStart?: number;
  bodyKind?: HomeRevealKind;
  entries: number;
}

function revealKind(element: HTMLElement): HomeRevealKind {
  switch (element.dataset.revealKind) {
    case 'heading':
      return 'heading';
    case 'preview':
      return 'preview';
    case 'craft':
      return 'craft';
    case 'writing':
      return 'writing';
    case 'note':
      return 'note';
    default:
      return 'text';
  }
}

function isInViewport(bounds: DOMRect) {
  return (
    bounds.width > 0 &&
    bounds.height > 0 &&
    bounds.bottom > 0 &&
    bounds.top < window.innerHeight &&
    bounds.right > 0 &&
    bounds.left < window.innerWidth
  );
}

function isNavigationReturn() {
  const documentLoad = performance.getEntriesByType?.('navigation')[0];
  return (
    documentLoad &&
    (new URL(documentLoad.name, window.location.href).pathname !== '/' ||
      ('type' in documentLoad && documentLoad.type === 'back_forward'))
  );
}

function closestControl(target: EventTarget | null) {
  return target instanceof Element ? target.closest(controlSelector) : null;
}

/** CSS owns first paint and fail-open; WAAPI owns only finite, interruptible motion. */
export function HomeMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const initialVisit = useRef<boolean | undefined>(undefined);

  useLayoutEffect(() => {
    const container = root.current;
    if (!container) {
      return;
    }
    const elements = Array.from(
      container.querySelectorAll<HTMLElement>('[data-reveal]')
    );
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const active = new Map<HTMLElement, Animation>();
    const accents = new Map<HTMLElement, Animation>();
    const schedules = new Map<string, GroupSchedule>();
    const blurred = new Set<HTMLElement>();
    let latest: { group: string; at: number } | undefined;
    let keyboardNavigation = false;
    let disposed = false;
    const cancelAccent = (element: HTMLElement) => {
      const animation = accents.get(element);
      if (!animation) {
        return;
      }
      animation.onfinish = null;
      animation.cancel();
      accents.delete(element);
    };
    const cancel = (element: HTMLElement) => {
      cancelAccent(element);
      blurred.delete(element);
      const animation = active.get(element);
      if (!animation) {
        return;
      }
      animation.onfinish = null;
      animation.cancel();
      active.delete(element);
    };
    const show = (element: HTMLElement) => {
      element.dataset.revealState = 'visible';
      cancel(element);
    };
    const showAll = () => elements.forEach(show);

    if (initialVisit.current === undefined) {
      initialVisit.current = !hasVisitedHome && !isNavigationReturn();
      hasVisitedHome = true;
    }
    if (
      media.matches ||
      !initialVisit.current ||
      typeof IntersectionObserver !== 'function' ||
      typeof HTMLElement.prototype.animate !== 'function'
    ) {
      showAll();
      return;
    }

    const describe = (targets: HTMLElement[]): HomeRevealItem[] =>
      targets.map((element, id) => {
        const group = element.closest<HTMLElement>('[data-reveal-group]');
        return {
          id,
          group: group?.dataset.revealGroup ?? 'home',
          sequence: group?.dataset.revealSequence === 'list' ? 'list' : 'stack',
          kind: revealKind(element),
          selected: element.dataset.revealSelected === 'true',
        };
      });
    const playNoteAccent = (element: HTMLElement) => {
      if (
        disposed ||
        media.matches ||
        keyboardNavigation ||
        revealKind(element) !== 'note' ||
        !isInViewport(element.getBoundingClientRect())
      ) {
        return;
      }
      const text = element.querySelector<HTMLElement>('[data-note-accent]');
      if (!text) {
        return;
      }
      const strength = window.innerWidth <= 640 ? 0.5 : 1;
      // Move only the text. Its parent's fixed tilt and arrow stay unchanged.
      const animation = text.animate(
        [
          { transform: 'rotate(0deg)', offset: 0, easing: noteEase },
          {
            transform: `rotate(${-1.2 * strength}deg)`,
            offset: 0.35,
            easing: noteEase,
          },
          {
            transform: `rotate(${0.4 * strength}deg)`,
            offset: 0.7,
            easing: noteEase,
          },
          { transform: 'rotate(0deg)', offset: 1 },
        ],
        { duration: 360, iterations: 1 }
      );
      accents.set(element, animation);
      animation.onfinish = () => cancelAccent(element);
    };
    const start = (
      element: HTMLElement,
      phase: 'initial' | 'entering',
      step: { delay: number; blur: number; distance: number },
      epoch: number
    ) => {
      cancel(element);
      element.dataset.revealState = phase;
      if (step.blur > 0) {
        blurred.add(element);
      }
      const animation = element.animate(
        [
          {
            opacity: 0,
            filter: `blur(${step.blur}px)`,
            transform: `translateY(${step.distance}px)`,
          },
          finalFrame,
        ],
        {
          duration: 900,
          delay: Math.max(0, epoch + step.delay - performance.now()),
          easing: initialEase,
          fill: 'both',
        }
      );
      active.set(element, animation);
      // Release the effect so finished text no longer retains a filter/transform layer.
      animation.onfinish = () => {
        show(element);
        element.dispatchEvent(
          new Event(HOME_REVEAL_COMPLETE, { bubbles: true })
        );
        // Immediate accessibility/fallback paths call show() without this accent.
        playNoteAccent(element);
      };
    };

    const reveal = (targets: HTMLElement[], phase: 'initial' | 'entering') => {
      const items = describe(targets);
      const firstGroup = items[0]?.group;
      if (!firstGroup) {
        return;
      }
      const firstItems = items.filter(item => item.group === firstGroup);
      const first =
        firstItems.find(item => item.kind !== 'note') ?? firstItems[0];
      let epoch = performance.now();
      if (latest?.group !== firstGroup) {
        if (latest) {
          epoch = Math.max(epoch, latest.at + 120);
        }
      } else {
        const previous = schedules.get(firstGroup);
        if (previous?.bodyStart !== undefined) {
          const gap =
            first.kind === 'note'
              ? HOME_NOTE_DELAY
              : first.sequence === 'stack' || previous.bodyKind === 'heading'
                ? 36
                : previous.entries >= 4
                  ? 0
                  : 60;
          epoch = Math.max(epoch, previous.bodyStart + gap);
        }
      }
      const plan = createHomeRevealPlan(
        items,
        window.innerWidth <= 640 ? HomeViewport.Compact : HomeViewport.Wide,
        {
          blurBudget: 12 - blurred.size,
          listEntries: new Map(
            Array.from(schedules, ([group, schedule]) => [
              group,
              schedule.entries,
            ])
          ),
        }
      );
      plan.forEach(step => {
        const item = items[step.id];
        const at = epoch + step.delay;
        const schedule = schedules.get(item.group) ?? { entries: 0 };
        if (item.kind !== 'note') {
          if (schedule.bodyStart === undefined || at >= schedule.bodyStart) {
            schedule.bodyStart = at;
            schedule.bodyKind = item.kind;
          }
          if (item.kind !== 'heading') {
            schedule.entries += 1;
          }
        }
        schedules.set(item.group, schedule);
        if (!latest || at >= latest.at) {
          latest = { group: item.group, at };
        }
        start(targets[step.id], phase, step, epoch);
      });
    };
    const observer = new IntersectionObserver(
      entries => {
        const entering = new Set<HTMLElement>();
        entries.forEach(entry => {
          if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) {
            return;
          }
          const element = entry.target;
          observer.unobserve(element);
          if (element.dataset.revealState !== 'pending') {
            return;
          }
          if (media.matches || keyboardNavigation) {
            show(element);
            return;
          }
          entering.add(element);
        });
        // Delivery order is unspecified; use the same DOM-ordered plan as first paint.
        reveal(
          elements.filter(element => entering.has(element)),
          'entering'
        );
      },
      { threshold: 0 }
    );

    // Finish all geometry/style reads before changing state. A late bundle must
    // never hide text which the CSS fallback has already made readable.
    const visibility = elements.map(element => ({
      element,
      inViewport: isInViewport(element.getBoundingClientRect()),
      alreadyVisible:
        element.dataset.revealState === 'visible' ||
        (!element.dataset.revealState &&
          getComputedStyle(element).opacity === '1'),
    }));
    const initial = visibility.filter(
      item => item.inViewport && !item.alreadyVisible
    );
    visibility.forEach(({ element, inViewport, alreadyVisible }) => {
      if (
        (alreadyVisible && inViewport) ||
        element.dataset.revealState === 'visible'
      ) {
        show(element);
      } else if (!inViewport) {
        element.dataset.revealState = 'pending';
        observer.observe(element);
      }
    });
    reveal(
      initial.map(({ element }) => element),
      'initial'
    );

    const settleActive = () =>
      new Set([...active.keys(), ...accents.keys()]).forEach(show);
    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (scrollKeys.has(event.key) && !closestControl(event.target)) {
        return;
      }
      keyboardNavigation = true;
      settleActive();
    };
    const showTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) {
        return;
      }
      const element = target.closest<HTMLElement>('[data-reveal]');
      if (element && container.contains(element)) {
        observer.unobserve(element);
        show(element);
      }
    };
    const handlePointer = () => {
      keyboardNavigation = false;
    };
    const handleActivation = (event: MouseEvent) => {
      const control = closestControl(event.target);
      if (!control) {
        return;
      }
      if (container.contains(control)) {
        showTarget(control);
      }
      // Capture runs before the existing Dock control's click handler.
      else {
        settleActive();
      }
    };
    const handleFocus = (event: FocusEvent) => showTarget(event.target);
    const handlePreference = () => {
      if (!media.matches) {
        return;
      }
      observer.disconnect();
      showAll();
    };
    const handlePageHide = () => {
      observer.disconnect();
      showAll();
    };
    // Also cover programmatic theme changes without coupling Home to Dock code.
    let isDarkTheme = document.documentElement.classList.contains('dark');
    const themeObserver = new MutationObserver(() => {
      const nextIsDark = document.documentElement.classList.contains('dark');
      // next-themes may reapply the same class during hydration.
      if (nextIsDark === isDarkTheme) {
        return;
      }
      isDarkTheme = nextIsDark;
      settleActive();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    container.addEventListener('focusin', handleFocus);
    window.addEventListener('keydown', handleKeyboard);
    window.addEventListener('pointerdown', handlePointer, { passive: true });
    window.addEventListener('click', handleActivation, true);
    window.addEventListener('pagehide', handlePageHide);
    media.addEventListener('change', handlePreference);
    return () => {
      disposed = true;
      observer.disconnect();
      themeObserver.disconnect();
      new Set([...active.keys(), ...accents.keys()]).forEach(cancel);
      container.removeEventListener('focusin', handleFocus);
      window.removeEventListener('keydown', handleKeyboard);
      window.removeEventListener('pointerdown', handlePointer);
      window.removeEventListener('click', handleActivation, true);
      window.removeEventListener('pagehide', handlePageHide);
      media.removeEventListener('change', handlePreference);
    };
  }, []);

  return (
    <div ref={root} className={styles.root} data-home-motion>
      <noscript>
        <style>{`[data-home-motion] [data-reveal] {
          animation: none !important;
          opacity: 1 !important;
          filter: none !important;
          transform: none !important;
        }`}</style>
      </noscript>
      {children}
    </div>
  );
}
