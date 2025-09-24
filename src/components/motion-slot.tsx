import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { isMotionComponent } from 'framer-motion';
import { Children, cloneElement, isValidElement, type ReactNode } from 'react';

type MotionSlotProps = {
  children: ReactNode | ReactNode[];
};

const shouldRemoveProp = (prop: string) => {
  const propsToRemove = [
    'animate',
    'initial',
    'transition',
    'variants',
    'whileDrag',
    'whileFocus',
    'whileHover',
    'whileInView',
    'whileTap',
    'onMouseMove',
    'onMouseLeave',
  ];
  return propsToRemove.includes(prop);
};

export const MotionSlot = ({ children }: MotionSlotProps) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  const processChild = (child: ReactNode): ReactNode => {
    if (isValidElement(child) && isMotionComponent(child.type)) {
      const childProps = child.props as Record<string, any>;
      const props = Object.keys(childProps).reduce(
        (acc: Record<string, any>, key) => {
          if (shouldRemoveProp(key) && prefersReducedMotion) {
            acc[key] = undefined;
          } else {
            acc[key] = childProps[key];
          }
          return acc;
        },
        {}
      );

      return cloneElement(child, props);
    }
    return child;
  };

  const processedChildren = Children.map(children, processChild);

  return <>{processedChildren}</>;
};

MotionSlot.displayName = 'MotionSlot';
