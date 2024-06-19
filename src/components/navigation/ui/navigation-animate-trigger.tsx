'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { motion, useMotionValue } from 'framer-motion';
import type { ReactNode } from 'react';
import { Children, cloneElement, forwardRef, isValidElement } from 'react';

import { MotionSlot } from '@/components/motion-slot';
import { cn } from '@/lib/utils';
import { DEFAULT_DISTANCE, DEFAULT_MAGNIFICATION } from '../consts/size';
import type { ItemMotionProps } from '../types/motion';

const navigationAnimateTriggerVariants = cva(
  'bd-items-end sm bd-flex bd-w-full bd-gap-2 bd-py-2 sm:bd-h-auto bd-h-20'
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
      <MotionSlot>
        <motion.div
          ref={ref}
          onMouseMove={e => mousex.set(e.pageX)}
          onMouseLeave={() => mousex.set(Infinity)}
          className={cn(navigationAnimateTriggerVariants({ className }))}
        >
          {renderChildren()}
        </motion.div>
      </MotionSlot>
    );
  }
);

NavigationAnimateTrigger.displayName = 'NavigationAnimateTrigger';
