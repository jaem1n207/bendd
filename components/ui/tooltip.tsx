"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "bd-z-50 bd-overflow-hidden bd-rounded-md bd-border bd-bg-popover bd-px-3 bd-py-1.5 bd-text-sm bd-text-popover-foreground bd-shadow-md bd-animate-in bd-fade-in-0 bd-zoom-in-95 data-[state=closed]:bd-animate-out data-[state=closed]:bd-fade-out-0 data-[state=closed]:bd-zoom-out-95 data-[side=bottom]:bd-slide-in-from-top-2 data-[side=left]:bd-slide-in-from-right-2 data-[side=right]:bd-slide-in-from-left-2 data-[side=top]:bd-slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
