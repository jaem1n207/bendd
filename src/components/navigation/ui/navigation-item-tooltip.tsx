'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import useMeasure from 'react-use-measure';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { isTouchDevice } from '@/lib/detect';
import { cn } from '@/lib/utils';
import { DEFAULT_ITEM_SIZE } from '../consts/size';
import { useNavigationItemAnimation } from '../model/use-navigation-item-animation';
import type { ItemMotionProps } from '../types/motion';

type NavigationItemTooltipProps = {
  name: string;
  children: ReactNode;
  content: ReactNode;
  className?: string;
} & ItemMotionProps;

export function NavigationItemTooltip({
  name,
  children,
  content,
  className,
  ...props
}: NavigationItemTooltipProps) {
  const [ref, bounds] = useMeasure();
  const { width, handleClick, controls } = useNavigationItemAnimation({
    name,
    size: DEFAULT_ITEM_SIZE,
    bounds,
    ...props,
  });

  return (
    <Tooltip delayDuration={50}>
      <TooltipTrigger asChild>
        <motion.div
          ref={ref}
          className={cn(
            'relative top-0 aspect-square rounded-full bg-gray-300 bg-navigation-item text-gray-900/80 hover:text-gray-900 shrink-0',
            className
          )}
          style={
            isTouchDevice
              ? {
                  width: DEFAULT_ITEM_SIZE,
                }
              : { width }
          }
          animate={controls}
          initial={{ top: 0 }}
          whileTap={{ top: 8 }}
          onTap={handleClick}
          tabIndex={-1}
        >
          {children}
        </motion.div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        className="mb-1 text-sm text-primary/60"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
