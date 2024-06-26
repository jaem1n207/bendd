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
            'bd-relative bd-top-0 bd-aspect-square bd-rounded-full bd-bg-gray-300 bd-bg-navigation-item bd-text-gray-900/80 hover:bd-text-gray-900 bd-shrink-0',
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
        className="bd-mb-1 bd-text-sm bd-text-primary/60"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
