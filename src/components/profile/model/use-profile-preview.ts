'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type {
  FocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent,
  PointerEvent,
} from 'react';

type ProfileLink = 'github' | 'youtube';

enum PreviewTransition {
  Animated = 'animated',
  Immediate = 'immediate',
}

const spring =
  'linear(0, .076 5%, .252 10%, .453 15%, .64 20%, .79 25%, .897 30%, .965 35%, 1.001 40%, 1.016 45%, 1.019 50%, 1.015 60%, 1.007 75%, 1)';

// One surface changes size and position; a snapshot preserves continuity even
// when another icon is reached before the previous transition has finished.
export function useProfilePreview() {
  const [active, setActive] = useState<ProfileLink | null>(null);
  const [rendered, setRendered] = useState<ProfileLink>('github');
  const panelRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const anchor = useRef<HTMLAnchorElement | null>(null);
  const previous = useRef<{ rect: DOMRect; opacity: string } | null>(null);
  const activeRef = useRef<ProfileLink | null>(null);
  const moving = useRef<Animation[]>([]);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const keyboard = useRef(true);
  const touch = useRef(false);
  const previewedByTouch = useRef<ProfileLink | null>(null);
  const id = useId();

  const cancelMotion = useCallback(() => {
    moving.current.forEach(animation => {
      animation.onfinish = null;
      animation.cancel();
    });
    moving.current = [];
  }, []);

  const keepOpen = useCallback(() => clearTimeout(leaveTimer.current), []);

  const close = useCallback(
    (transition = PreviewTransition.Immediate) => {
      keepOpen();
      const panel = panelRef.current;
      if (!activeRef.current && (!panel || panel.hidden)) {
        return;
      }
      const opacity = panel ? getComputedStyle(panel).opacity : '1';
      const transform = panel ? getComputedStyle(panel).transform : 'none';
      cancelMotion();
      activeRef.current = null;
      previewedByTouch.current = null;
      setActive(null);
      previous.current = null;
      if (!panel || panel.hidden) {
        return;
      }
      if (
        transition === PreviewTransition.Animated &&
        !keyboard.current &&
        !matchMedia('(prefers-reduced-motion: reduce)').matches &&
        typeof panel.animate === 'function'
      ) {
        // Closed content stops accepting input while the short exit finishes.
        const animation = panel.animate(
          [
            { opacity, transform },
            { opacity: 0, transform: 'scale(.97)' },
          ],
          { duration: 130, easing: 'ease-out' }
        );
        animation.onfinish = () => {
          panel.hidden = true;
          moving.current = [];
        };
        moving.current = [animation];
      } else {
        panel.hidden = true;
      }
    },
    [cancelMotion, keepOpen]
  );

  const show = (
    key: ProfileLink,
    element: HTMLAnchorElement,
    transition: PreviewTransition
  ) => {
    keepOpen();
    keyboard.current = transition === PreviewTransition.Immediate;
    if (activeRef.current === key) {
      return;
    }
    const panel = panelRef.current;
    previous.current =
      panel && !panel.hidden
        ? {
            rect: panel.getBoundingClientRect(),
            opacity: getComputedStyle(panel).opacity,
          }
        : null;
    cancelMotion();
    anchor.current = element;
    activeRef.current = key;
    setRendered(key);
    setActive(key);
  };

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const trigger = anchor.current;
    if (!active || !panel || !trigger) {
      return;
    }
    panel.hidden = false;
    panel.style.height = 'auto';
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportLeft = viewport?.offsetLeft ?? 0;
    const viewportWidth = viewport?.width ?? window.innerWidth;
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const width = Math.min(active === 'github' ? 306 : 274, viewportWidth - 24);
    panel.style.width = `${width}px`;
    panel.style.maxHeight = `${viewportHeight - 24}px`;
    // offsetHeight rounds down fractional text metrics and can introduce an
    // unnecessary scrollbar when the measured height is applied back to the card.
    const height = Math.ceil(panel.getBoundingClientRect().height);
    const bounds = trigger.getBoundingClientRect();
    const topSpace = bounds.top - viewportTop - 12;
    const bottomSpace = viewportTop + viewportHeight - bounds.bottom - 12;
    const below = topSpace < height + 12 && bottomSpace > topSpace;
    const x = Math.max(
      viewportLeft + 12,
      Math.min(
        bounds.left + bounds.width / 2 - width / 2,
        viewportLeft + viewportWidth - width - 12
      )
    );
    const rawY = below ? bounds.bottom + 12 : bounds.top - height - 12;
    const y = Math.max(
      viewportTop + 12,
      Math.min(rawY, viewportTop + viewportHeight - height - 12)
    );
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
    panel.style.height = `${height}px`;
    panel.dataset.side = below ? 'bottom' : 'top';
    panel.style.transformOrigin = `${Math.max(12, Math.min(width - 12, bounds.left + bounds.width / 2 - x))}px ${below ? '0' : `${height}px`}`;
    const old = previous.current;
    previous.current = null;
    if (
      keyboard.current ||
      matchMedia('(prefers-reduced-motion: reduce)').matches ||
      typeof panel.animate !== 'function'
    ) {
      return;
    }
    const from = old
      ? `translate(${old.rect.left - x}px, ${old.rect.top - y}px) scale(${old.rect.width / width}, ${old.rect.height / height})`
      : `translateY(${below ? -8 : 8}px) scale(.95)`;
    if (old) {
      panel.style.transformOrigin = '0 0';
    }
    // Older browsers keep the same transition with a supported ease-out curve.
    const easing =
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('animation-timing-function', spring)
        ? spring
        : 'cubic-bezier(.22,1,.36,1)';
    const position = panel.animate(
      [
        { opacity: old?.opacity ?? 0, transform: from },
        { opacity: 1, transform: 'translate(0,0) scale(1)' },
      ],
      { duration: old ? 460 : 520, easing }
    );
    moving.current = [position];
    const content = contentRef.current;
    if (content) {
      moving.current.push(
        content.animate(
          // The outer surface already moves. Translating this full-height child
          // expands the scrollable overflow by 3px while the fade is running.
          [{ opacity: old ? 0.2 : 0 }, { opacity: 1 }],
          { duration: 190, easing: 'cubic-bezier(.2,.8,.2,1)' }
        )
      );
    }
  }, [active]);

  useEffect(() => {
    const dismiss = () => close();
    const onScroll = (event: Event) => {
      if (
        event.target instanceof Node &&
        panelRef.current?.contains(event.target)
      ) {
        return;
      }
      dismiss();
    };
    const onKey = (event: KeyboardEvent) => {
      keyboard.current = true;
      touch.current = false;
      if (event.key !== 'Escape' || !activeRef.current) {
        return;
      }
      const panelHadFocus = panelRef.current?.contains(document.activeElement);
      close();
      // Restore the trigger without reopening it through its focus handler.
      if (panelHadFocus && anchor.current) {
        anchor.current.focus({ preventScroll: true });
        close();
      }
    };
    const onPointer = (event: globalThis.PointerEvent) => {
      keyboard.current = false;
      touch.current =
        event.pointerType === 'touch' ||
        matchMedia('(pointer: coarse)').matches;
      if (
        event.target instanceof Node &&
        !panelRef.current?.contains(event.target) &&
        !navRef.current?.contains(event.target)
      ) {
        close();
      }
    };
    const onFocus = (event: globalThis.FocusEvent) => {
      if (
        event.target instanceof Node &&
        !panelRef.current?.contains(event.target) &&
        !navRef.current?.contains(event.target)
      ) {
        close();
      }
    };
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const onPreference = () => {
      if (!preference.matches) {
        return;
      }
      cancelMotion();
      if (!activeRef.current && panelRef.current) {
        panelRef.current.hidden = true;
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('focusin', onFocus);
    window.addEventListener('scroll', onScroll, {
      passive: true,
      capture: true,
    });
    window.addEventListener('resize', dismiss);
    window.visualViewport?.addEventListener('resize', dismiss);
    preference.addEventListener('change', onPreference);
    return () => {
      keepOpen();
      cancelMotion();
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('focusin', onFocus);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', dismiss);
      window.visualViewport?.removeEventListener('resize', dismiss);
      preference.removeEventListener('change', onPreference);
    };
  }, [cancelMotion, close, keepOpen]);

  const leave = () => {
    keepOpen();
    if (
      touch.current ||
      navRef.current?.contains(document.activeElement) ||
      panelRef.current?.contains(document.activeElement)
    ) {
      return;
    }
    leaveTimer.current = setTimeout(
      () => close(PreviewTransition.Animated),
      160
    );
  };

  const triggerProps = (key: ProfileLink) => ({
    'aria-expanded': active === key,
    'aria-controls': active === key ? id : undefined,
    'aria-keyshortcuts': 'ArrowUp ArrowDown',
    onKeyDown: (event: ReactKeyboardEvent<HTMLAnchorElement>) => {
      if (
        activeRef.current !== key ||
        !['ArrowUp', 'ArrowDown'].includes(event.key)
      ) {
        return;
      }
      event.preventDefault();
      panelRef.current?.querySelector<HTMLAnchorElement>('a[href]')?.focus();
    },
    onPointerEnter: (event: PointerEvent<HTMLAnchorElement>) => {
      if (
        event.pointerType !== 'touch' &&
        !matchMedia('(pointer: coarse)').matches
      ) {
        show(key, event.currentTarget, PreviewTransition.Animated);
      }
    },
    onPointerLeave: leave,
    onFocus: (event: FocusEvent<HTMLAnchorElement>) => {
      if (!touch.current) {
        show(
          key,
          event.currentTarget,
          keyboard.current
            ? PreviewTransition.Immediate
            : PreviewTransition.Animated
        );
      }
    },
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      if (
        event.detail === 0 ||
        (!touch.current && !matchMedia('(pointer: coarse)').matches)
      ) {
        return;
      }
      if (previewedByTouch.current === key && activeRef.current === key) {
        return;
      }
      event.preventDefault();
      previewedByTouch.current = key;
      show(key, event.currentTarget, PreviewTransition.Animated);
    },
  });

  return {
    active,
    rendered,
    id,
    panelRef,
    contentRef,
    navRef,
    triggerProps,
    dismiss: () => close(),
    keepOpen,
    leave,
  };
}
