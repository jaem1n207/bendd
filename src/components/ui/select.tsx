'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: 'sm' | 'default';
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        'bd:border-input bd:data-[placeholder]:text-muted-foreground bd:[&_svg:not([class*=text-])]:text-muted-foreground bd:focus-visible:border-ring bd:focus-visible:ring-ring/50 bd:aria-invalid:ring-destructive/20 bd:dark:aria-invalid:ring-destructive/40 bd:aria-invalid:border-destructive bd:dark:bg-input/30 bd:dark:hover:bg-input/50 bd:flex bd:w-fit bd:items-center bd:justify-between bd:gap-2 bd:rounded-md bd:border bd:bg-transparent bd:px-3 bd:py-2 bd:text-sm bd:whitespace-nowrap bd:shadow-xs bd:transition-[color,box-shadow] bd:outline-none bd:focus-visible:ring-[3px] bd:disabled:cursor-not-allowed bd:disabled:opacity-50 bd:data-[size=default]:h-9 bd:data-[size=sm]:h-8 bd:*:data-[slot=select-value]:line-clamp-1 bd:*:data-[slot=select-value]:flex bd:*:data-[slot=select-value]:items-center bd:*:data-[slot=select-value]:gap-2 bd:[&_svg]:pointer-events-none bd:[&_svg]:shrink-0 bd:[&_svg:not([class*=size-])]:size-4',
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="bd:size-4 bd:opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = 'popper',
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          'bd:bg-popover bd:text-popover-foreground bd:data-[state=open]:animate-in bd:data-[state=closed]:animate-out bd:data-[state=closed]:fade-out-0 bd:data-[state=open]:fade-in-0 bd:data-[state=closed]:zoom-out-95 bd:data-[state=open]:zoom-in-95 bd:data-[side=bottom]:slide-in-from-top-2 bd:data-[side=left]:slide-in-from-right-2 bd:data-[side=right]:slide-in-from-left-2 bd:data-[side=top]:slide-in-from-bottom-2 bd:relative bd:z-50 bd:max-h-(--radix-select-content-available-height) bd:min-w-[8rem] bd:origin-(--radix-select-content-transform-origin) bd:overflow-x-hidden bd:overflow-y-auto bd:rounded-md bd:border bd:shadow-md',
          position === 'popper' &&
            'bd:data-[side=bottom]:translate-y-1 bd:data-[side=left]:-translate-x-1 bd:data-[side=right]:translate-x-1 bd:data-[side=top]:-translate-y-1',
          className
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            'bd:p-1',
            position === 'popper' &&
              'bd:h-[var(--radix-select-trigger-height)] bd:w-full bd:min-w-[var(--radix-select-trigger-width)] bd:scroll-my-1'
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn(
        'bd:text-muted-foreground bd:px-2 bd:py-1.5 bd:text-xs',
        className
      )}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        'bd:focus:bg-accent bd:focus:text-accent-foreground bd:[&_svg:not([class*=text-])]:text-muted-foreground bd:relative bd:flex bd:w-full bd:cursor-default bd:items-center bd:gap-2 bd:rounded-sm bd:py-1.5 bd:pr-8 bd:pl-2 bd:text-sm bd:outline-hidden bd:select-none bd:data-[disabled]:pointer-events-none bd:data-[disabled]:opacity-50 bd:[&_svg]:pointer-events-none bd:[&_svg]:shrink-0 bd:[&_svg:not([class*=size-])]:size-4 bd:*:[span]:last:flex bd:*:[span]:last:items-center bd:*:[span]:last:gap-2',
        className
      )}
      {...props}
    >
      <span className="bd:absolute bd:right-2 bd:flex bd:size-3.5 bd:items-center bd:justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="bd:size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(
        'bd:bg-border bd:pointer-events-none bd:-mx-1 bd:my-1 bd:h-px',
        className
      )}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        'bd:flex bd:cursor-default bd:items-center bd:justify-center bd:py-1',
        className
      )}
      {...props}
    >
      <ChevronUpIcon className="bd:size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        'bd:flex bd:cursor-default bd:items-center bd:justify-center bd:py-1',
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="bd:size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

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
