'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { motion, useMotionValue } from 'motion/react';
import type { ReactNode } from 'react';
import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  useRef,
} from 'react';

import { FluidHover } from '@/components/ui/fluid-hover';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { useScrollFade } from '@/hooks/use-scroll-fade';
import { cn } from '@/lib/utils';
import {
  DEFAULT_DISTANCE,
  DEFAULT_MAGNIFICATION,
} from '@/components/navigation/consts/size';
import type { ItemMotionProps } from '@/components/navigation/types/motion';

const navigationAnimateTriggerVariants = cva(
  'scroll-fade-x xs:scroll-fade-none flex h-20 w-full items-end gap-2 overflow-x-auto overflow-y-hidden py-2 [--scroll-fade-reveal:32px] [--scroll-fade-size:12px] xs:h-auto xs:overflow-visible'
);

type NavigationAnimateTriggerProps = VariantProps<
  typeof navigationAnimateTriggerVariants
> & {
  children: ReactNode | ReactNode[];
  className?: string;
  magnification?: number;
  distance?: number;
};

export const NavigationAnimateTrigger = forwardRef<
  HTMLDivElement,
  NavigationAnimateTriggerProps
>(
  (
    {
      children,
      className,
      magnification = DEFAULT_MAGNIFICATION,
      distance = DEFAULT_DISTANCE,
    },
    ref
  ) => {
    const mousex = useMotionValue(Infinity);
    const reduceMotion = usePrefersReducedMotion();
    const scrollRef = useRef<HTMLDivElement | null>(null);
    useScrollFade(scrollRef, 'x', Children.count(children));

    const setRef = useCallback(
      (element: HTMLDivElement | null) => {
        scrollRef.current = element;
        if (typeof ref === 'function') {
          ref(element);
        } else if (ref) {
          ref.current = element;
        }
      },
      [ref]
    );

    const renderChildren = () => {
      return Children.map(children, (child: ReactNode) => {
        if (!isValidElement(child)) return child;

        return cloneElement(child, {
          mousex: mousex,
          magnification: magnification,
          distance: distance,
        } as ItemMotionProps);
      });
    };

    return (
      <FluidHover
        axis="x"
        itemSelector="[data-navigation-item]"
        highlightClassName="z-20 rounded-full bg-primary/10"
      >
        <motion.div
          ref={setRef}
          onMouseMove={e => {
            if (!reduceMotion) {
              mousex.set(e.pageX);
            }
          }}
          onMouseLeave={() => mousex.set(Infinity)}
          className={cn(navigationAnimateTriggerVariants({ className }))}
        >
          {renderChildren()}
        </motion.div>
      </FluidHover>
    );
  }
);

NavigationAnimateTrigger.displayName = 'NavigationAnimateTrigger';
