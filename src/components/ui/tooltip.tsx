'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '@/lib/utils';

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          'bd:bg-foreground bd:text-background bd:animate-in bd:fade-in-0 bd:zoom-in-95 bd:data-[state=closed]:animate-out bd:data-[state=closed]:fade-out-0 bd:data-[state=closed]:zoom-out-95 bd:data-[side=bottom]:slide-in-from-top-2 bd:data-[side=left]:slide-in-from-right-2 bd:data-[side=right]:slide-in-from-left-2 bd:data-[side=top]:slide-in-from-bottom-2 bd:z-50 bd:w-fit bd:origin-(--radix-tooltip-content-transform-origin) bd:rounded-md bd:px-3 bd:py-1.5 bd:text-xs bd:text-balance',
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="bd:bg-foreground bd:fill-foreground bd:z-50 bd:size-2.5 bd:translate-y-[calc(-50%_-_2px)] bd:rotate-45 bd:rounded-[2px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
