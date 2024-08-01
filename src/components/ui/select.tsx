'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'bd-flex bd-h-10 bd-w-full bd-items-center bd-justify-between bd-rounded-md bd-border bd-border-input bd-bg-background bd-px-3 bd-py-2 bd-text-sm bd-ring-offset-background placeholder:bd-text-muted-foreground focus:bd-outline-none focus:bd-ring-2 focus:bd-ring-ring focus:bd-ring-offset-2 disabled:bd-cursor-not-allowed disabled:bd-opacity-50 [&>span]:bd-line-clamp-1',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="bd-h-4 bd-w-4 bd-opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      'bd-flex bd-cursor-default bd-items-center bd-justify-center bd-py-1',
      className
    )}
    {...props}
  >
    <ChevronUp className="bd-h-4 bd-w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      'bd-flex bd-cursor-default bd-items-center bd-justify-center bd-py-1',
      className
    )}
    {...props}
  >
    <ChevronDown className="bd-h-4 bd-w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        'bd-relative bd-z-50 bd-max-h-96 bd-min-w-[8rem] bd-overflow-hidden bd-rounded-md bd-border bd-bg-popover bd-text-popover-foreground bd-shadow-md data-[state=open]:bd-animate-in data-[state=closed]:bd-animate-out data-[state=closed]:bd-fade-out-0 data-[state=open]:bd-fade-in-0 data-[state=closed]:bd-zoom-out-95 data-[state=open]:bd-zoom-in-95 data-[side=bottom]:bd-slide-in-from-top-2 data-[side=left]:bd-slide-in-from-right-2 data-[side=right]:bd-slide-in-from-left-2 data-[side=top]:bd-slide-in-from-bottom-2',
        position === 'popper' &&
          'data-[side=bottom]:bd-translate-y-1 data-[side=left]:bd--translate-x-1 data-[side=right]:bd-translate-x-1 data-[side=top]:bd--translate-y-1',
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          'bd-p-1',
          position === 'popper' &&
            'bd-h-[var(--radix-select-trigger-height)] bd-w-full bd-min-w-[var(--radix-select-trigger-width)]'
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      'bd-py-1.5 bd-pl-8 bd-pr-2 bd-text-sm bd-font-semibold',
      className
    )}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'bd-relative bd-flex bd-w-full bd-cursor-default bd-select-none bd-items-center bd-rounded-sm bd-py-1.5 bd-pl-8 bd-pr-2 bd-text-sm bd-outline-none focus:bd-bg-accent focus:bd-text-accent-foreground data-[disabled]:bd-pointer-events-none data-[disabled]:bd-opacity-50',
      className
    )}
    {...props}
  >
    <span className="bd-absolute bd-left-2 bd-flex bd-h-3.5 bd-w-3.5 bd-items-center bd-justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="bd-h-4 bd-w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('bd--mx-1 bd-my-1 bd-h-px bd-bg-muted', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
