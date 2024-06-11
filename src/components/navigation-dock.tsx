/**
 * https://buildui.com/recipes/magnified-dock 을 참고해 보다 Mac OS Dock과 유사하게 재구성한 컴포넌트입니다.
 */

'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import {
  MotionValue,
  motion,
  useAnimation,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Children, cloneElement, forwardRef, isValidElement } from 'react';
import useMeasure from 'react-use-measure';

import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';

const DEFAULT_ITEM_SIZE = 40;
const DEFAULT_MAGNIFICATION = DEFAULT_ITEM_SIZE * 2;
const DEFAULT_DISTANCE = DEFAULT_MAGNIFICATION * 2;

const navigationDockVariants = cva(
  'bd-items-end sm bd-flex bd-w-full bd-gap-2 bd-py-2 sm:bd-h-auto bd-h-20'
);

type NavigationDockProps = VariantProps<typeof navigationDockVariants> & {
  children: ReactNode | ReactNode[];
  className?: string;
} & Omit<NavigationDockItemMotionValue, 'mousex'>;

export const NavigationDock = forwardRef<HTMLDivElement, NavigationDockProps>(
  (
    {
      children,
      className,
      magnification = DEFAULT_MAGNIFICATION,
      distance = DEFAULT_DISTANCE,
    },
    ref
  ) => {
    const prefersReducedMotion = usePrefersReducedMotion();

    const mousex = useMotionValue(Infinity);

    const renderChildren = () => {
      return Children.map(children, (child: ReactNode) => {
        if (!isValidElement(child)) return child;

        return cloneElement(child, {
          mousex: mousex,
          magnification: magnification,
          distance: distance,
        } as NavigationDockItemMotionValue);
      });
    };

    return (
      <motion.div
        ref={ref}
        onMouseMove={
          prefersReducedMotion ? undefined : e => mousex.set(e.pageX)
        }
        onMouseLeave={
          prefersReducedMotion ? undefined : () => mousex.set(Infinity)
        }
        className={cn(navigationDockVariants({ className }))}
      >
        {renderChildren()}
      </motion.div>
    );
  }
);

NavigationDock.displayName = 'NavigationDock';

type NavigationDockItemMotionValue = {
  magnification?: number;
  distance?: number;
  mousex?: MotionValue<number>;
};

type NavigationDockItemProps = {
  size?: number;
  className?: string;
  children?: ReactNode;
  slug?: string;
} & NavigationDockItemMotionValue;

export const NavigationDockItem = ({
  size = DEFAULT_ITEM_SIZE,
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  mousex,
  className,
  children,
  slug,
}: NavigationDockItemProps) => {
  const [ref, bounds] = useMeasure();
  const controls = useAnimation();
  const pathname = usePathname();

  const prefersReducedMotion = usePrefersReducedMotion();

  const distanceCalc = useTransform(mousex!, (val: number) => {
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(
    distanceCalc,
    [-distance, 0, distance],
    [size, magnification, size]
  );
  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const handleClick = async () => {
    if (prefersReducedMotion) return;

    await controls.start({ top: -DEFAULT_ITEM_SIZE / 2 });
    controls.start({ top: 0 });
  };

  const isActive = new RegExp(`^${slug}(\/|$)`).test(pathname);

  return (
    <motion.div
      ref={ref}
      style={{ width }}
      className={cn(
        'bd-relative bd-top-0 bd-aspect-square bd-rounded-full bd-bg-gray-300 bd-bg-navigation-item bd-text-gray-900/80 hover:bd-text-gray-900',
        className
      )}
      animate={controls}
      whileTap={prefersReducedMotion ? undefined : { top: 8 }}
      onTap={handleClick}
      initial={{ top: 0 }}
    >
      <div className="bd-absolute -bd-top-[1px] -bd-z-10 bd-size-full bd-rounded-full bd-opacity-80 dark:bd-bg-navigation-item-top-highlight" />
      {children}
      <div
        className={cn(
          'bd-absolute -bd-bottom-1.5 bd-left-[calc(50%-0.125rem)] bd-size-1 bd-rounded-full bd-bg-gray-800',
          isActive ? 'bd-opacity-100' : 'bd-opacity-0'
        )}
      />
    </motion.div>
  );
};
