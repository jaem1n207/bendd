'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight, Circle } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      'bd-flex bd-cursor-default bd-select-none bd-items-center bd-rounded-sm bd-px-2 bd-py-1.5 bd-text-sm bd-outline-none focus:bd-bg-accent data-[state=open]:bd-bg-accent',
      inset && 'bd-pl-8',
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="bd-ml-auto bd-h-4 bd-w-4" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName =
  DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      'bd-z-50 bd-min-w-[8rem] bd-overflow-hidden bd-rounded-md bd-border bd-bg-popover bd-p-1 bd-text-popover-foreground bd-shadow-lg data-[state=open]:bd-animate-in data-[state=closed]:bd-animate-out data-[state=closed]:bd-fade-out-0 data-[state=open]:bd-fade-in-0 data-[state=closed]:bd-zoom-out-95 data-[state=open]:bd-zoom-in-95 data-[side=bottom]:bd-slide-in-from-top-2 data-[side=left]:bd-slide-in-from-right-2 data-[side=right]:bd-slide-in-from-left-2 data-[side=top]:bd-slide-in-from-bottom-2',
      className
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName =
  DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'bd-z-50 bd-min-w-[8rem] bd-overflow-hidden bd-rounded-md bd-border bd-bg-popover bd-p-1 bd-text-popover-foreground bd-shadow-md data-[state=open]:bd-animate-in data-[state=closed]:bd-animate-out data-[state=closed]:bd-fade-out-0 data-[state=open]:bd-fade-in-0 data-[state=closed]:bd-zoom-out-95 data-[state=open]:bd-zoom-in-95 data-[side=bottom]:bd-slide-in-from-top-2 data-[side=left]:bd-slide-in-from-right-2 data-[side=right]:bd-slide-in-from-left-2 data-[side=top]:bd-slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'bd-relative bd-flex bd-cursor-default bd-select-none bd-items-center bd-rounded-sm bd-px-2 bd-py-1.5 bd-text-sm bd-outline-none bd-transition-colors focus:bd-bg-accent focus:bd-text-accent-foreground data-[disabled]:bd-pointer-events-none data-[disabled]:bd-opacity-50',
      inset && 'bd-pl-8',
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      'bd-relative bd-flex bd-cursor-default bd-select-none bd-items-center bd-rounded-sm bd-py-1.5 bd-pl-8 bd-pr-2 bd-text-sm bd-outline-none bd-transition-colors focus:bd-bg-accent focus:bd-text-accent-foreground data-[disabled]:bd-pointer-events-none data-[disabled]:bd-opacity-50',
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="bd-absolute bd-left-2 bd-flex bd-h-3.5 bd-w-3.5 bd-items-center bd-justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="bd-h-4 bd-w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      'bd-relative bd-flex bd-cursor-default bd-select-none bd-items-center bd-rounded-sm bd-py-1.5 bd-pl-8 bd-pr-2 bd-text-sm bd-outline-none bd-transition-colors focus:bd-bg-accent focus:bd-text-accent-foreground data-[disabled]:bd-pointer-events-none data-[disabled]:bd-opacity-50',
      className
    )}
    {...props}
  >
    <span className="bd-absolute bd-left-2 bd-flex bd-h-3.5 bd-w-3.5 bd-items-center bd-justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="bd-h-2 bd-w-2 bd-fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      'bd-px-2 bd-py-1.5 bd-text-sm bd-font-semibold',
      inset && 'bd-pl-8',
      className
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('bd--mx-1 bd-my-1 bd-h-px bd-bg-muted', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        'bd-ml-auto bd-text-xs bd-tracking-widest bd-opacity-60',
        className
      )}
      {...props}
    />
  );
};
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
