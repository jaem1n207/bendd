'use client';

import { Slot, Slottable } from '@radix-ui/react-slot';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactElement,
} from 'react';

import { FluidHoverHighlight } from '@/components/ui/fluid-hover-highlight';
import {
  useFluidHover,
  type UseFluidHoverOptions,
} from '@/hooks/use-fluid-hover';
import { cn } from '@/lib/utils';

interface FluidHoverProps {
  children: ReactElement;
  axis?: UseFluidHoverOptions['axis'];
  itemSelector?: string;
  highlightClassName?: string;
}

const GROUP_SELECTOR = '[data-fluid-hover-group]';
const ITEM_SELECTOR = '[data-fluid-hover-item]';
const DISABLED_SELECTOR =
  ':disabled, [disabled], [aria-disabled="true"], [data-disabled], [data-fluid-hover-disabled]';

function isItemDisabled(element: HTMLElement) {
  return (
    element.matches(DISABLED_SELECTOR) || element.getClientRects().length === 0
  );
}

/** 서버 컴포넌트의 링크와 Radix 항목을 그대로 등록하는 앱 어댑터. */
export function FluidHover({
  children,
  axis = 'y',
  itemSelector = ITEM_SELECTOR,
  highlightClassName,
}: FluidHoverProps) {
  const containerRef = useRef<HTMLElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const attachContainer = useCallback((element: HTMLElement | null) => {
    containerRef.current = element;
    setContainer(element);
  }, []);
  const itemsRef = useRef<HTMLElement[]>([]);
  const pointerRef = useRef<MouseEvent<HTMLElement> | null>(null);
  const pointerTypeRef = useRef('mouse');
  const [input, setInput] = useState<'pointer' | 'keyboard'>('pointer');
  const hover = useFluidHover(containerRef, {
    axis,
    isItemDisabled,
    // 링크의 새 탭/수정 키 동작과 Radix의 선택 이벤트를 그대로 보존한다.
    gapClick: false,
  });
  const { registerItem, setActiveIndex, handlers, measureItems } = hover;
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!container) {
      return;
    }

    const syncItems = () => {
      const next = Array.from(
        container.querySelectorAll<HTMLElement>(itemSelector)
      ).filter(element => element.closest(GROUP_SELECTOR) === container);
      const previous = itemsRef.current;
      previous.forEach((element, index) => {
        if (next[index] !== element) {
          registerItem(index, null);
        }
      });
      next.forEach((element, index) => {
        if (previous[index] !== element) {
          registerItem(index, element);
        }
      });
      itemsRef.current = next;
    };

    syncItems();
    // 커서가 멈춰 있어도 스크롤과 reflow로 바뀐 가장 가까운 항목을 따른다.
    const refreshPointer = () => {
      const event = pointerRef.current;
      if (!event) {
        return;
      }
      const rect = container.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        pointerRef.current = null;
        handlersRef.current.onMouseLeave();
        return;
      }
      handlersRef.current.onMouseMove(event);
    };
    const observer = new MutationObserver(records => {
      syncItems();
      if (records.some(record => record.type === 'attributes')) {
        const active = container.querySelector<HTMLElement>(
          '[data-fluid-hover-active]'
        );
        if (active && isItemDisabled(active)) {
          setActiveIndex(null);
        }
        refreshPointer();
      }
    });
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'disabled',
        'aria-disabled',
        'data-disabled',
        'hidden',
        'data-fluid-hover-disabled',
      ],
    });

    const resize =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            measureItems();
            refreshPointer();
          });
    resize?.observe(container);
    window.addEventListener('scroll', refreshPointer, {
      capture: true,
      passive: true,
    });
    window.addEventListener('resize', refreshPointer, { passive: true });

    return () => {
      observer.disconnect();
      resize?.disconnect();
      window.removeEventListener('scroll', refreshPointer, true);
      window.removeEventListener('resize', refreshPointer);
      itemsRef.current.forEach((_, index) => registerItem(index, null));
      itemsRef.current = [];
    };
  }, [container, itemSelector, registerItem, measureItems, setActiveIndex]);

  useEffect(() => {
    if (hover.isMeasured && pointerRef.current) {
      handlersRef.current.onMouseMove(pointerRef.current);
    }
  }, [hover.itemRects, hover.isMeasured]);

  const focusItem = (target: EventTarget | null) => {
    if (!(target instanceof Node)) {
      return;
    }
    const index = itemsRef.current.findIndex(element =>
      element.contains(target)
    );
    const item = itemsRef.current[index];
    if (item && !isItemDisabled(item)) {
      setActiveIndex(index);
    }
  };

  const movePointer = (event: MouseEvent<HTMLElement>) => {
    if (pointerTypeRef.current === 'touch') {
      return;
    }
    if (
      event.target instanceof Element &&
      event.target.closest(GROUP_SELECTOR) !== containerRef.current
    ) {
      pointerRef.current = null;
      handlers.onMouseLeave();
      return;
    }
    pointerRef.current = event;
    setInput('pointer');
    handlers.onMouseMove(event);
  };

  const Overlay =
    children.type === 'ul' || children.type === 'ol' ? 'li' : 'div';

  return (
    <Slot
      ref={attachContainer}
      data-fluid-hover-group=""
      className="relative isolate"
      onPointerMove={event => {
        pointerTypeRef.current = event.pointerType;
      }}
      onPointerDown={event => {
        pointerTypeRef.current = event.pointerType;
        if (event.pointerType === 'touch') {
          pointerRef.current = null;
          handlers.onMouseLeave();
        }
      }}
      onMouseEnter={event => {
        handlers.onMouseEnter();
        movePointer(event);
      }}
      onMouseMove={movePointer}
      onMouseLeave={() => {
        pointerRef.current = null;
        handlers.onMouseLeave();
        if (input === 'keyboard') {
          focusItem(document.activeElement);
        }
      }}
      onKeyDownCapture={event => {
        pointerRef.current = null;
        setInput('keyboard');
        focusItem(event.target);
      }}
      onFocusCapture={event => {
        if (pointerTypeRef.current !== 'touch' && !pointerRef.current) {
          setInput('keyboard');
          focusItem(event.target);
        }
      }}
      onBlurCapture={event => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !containerRef.current?.contains(event.relatedTarget)
        ) {
          setActiveIndex(null);
        }
      }}
    >
      <Slottable>{children}</Slottable>
      <Overlay aria-hidden="true" className="contents">
        <FluidHoverHighlight
          hover={hover}
          transition={input === 'keyboard' ? false : undefined}
          className={cn('-z-10 rounded-xl bg-muted/50', highlightClassName)}
        />
      </Overlay>
    </Slot>
  );
}
