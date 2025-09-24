'use client';

import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { CheckIcon, ChevronRightIcon, CircleIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  );
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  );
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          'bd:bg-popover bd:text-popover-foreground bd:data-[state=open]:animate-in bd:data-[state=closed]:animate-out bd:data-[state=closed]:fade-out-0 bd:data-[state=open]:fade-in-0 bd:data-[state=closed]:zoom-out-95 bd:data-[state=open]:zoom-in-95 bd:data-[side=bottom]:slide-in-from-top-2 bd:data-[side=left]:slide-in-from-right-2 bd:data-[side=right]:slide-in-from-left-2 bd:data-[side=top]:slide-in-from-bottom-2 bd:z-50 bd:max-h-(--radix-dropdown-menu-content-available-height) bd:min-w-[8rem] bd:origin-(--radix-dropdown-menu-content-transform-origin) bd:overflow-x-hidden bd:overflow-y-auto bd:rounded-md bd:border bd:p-1 bd:shadow-md',
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: 'default' | 'destructive';
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        'bd:focus:bg-accent bd:focus:text-accent-foreground bd:data-[variant=destructive]:text-destructive bd:data-[variant=destructive]:focus:bg-destructive/10 bd:dark:data-[variant=destructive]:focus:bg-destructive/20 bd:data-[variant=destructive]:focus:text-destructive bd:data-[variant=destructive]:*:[svg]:!text-destructive bd:[&_svg:not([class*=text-])]:text-muted-foreground bd:relative bd:flex bd:cursor-default bd:items-center bd:gap-2 bd:rounded-sm bd:px-2 bd:py-1.5 bd:text-sm bd:outline-hidden bd:select-none bd:data-[disabled]:pointer-events-none bd:data-[disabled]:opacity-50 bd:data-[inset]:pl-8 bd:[&_svg]:pointer-events-none bd:[&_svg]:shrink-0 bd:[&_svg:not([class*=size-])]:size-4',
        className
      )}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        'bd:focus:bg-accent bd:focus:text-accent-foreground bd:relative bd:flex bd:cursor-default bd:items-center bd:gap-2 bd:rounded-sm bd:py-1.5 bd:pr-2 bd:pl-8 bd:text-sm bd:outline-hidden bd:select-none bd:data-[disabled]:pointer-events-none bd:data-[disabled]:opacity-50 bd:[&_svg]:pointer-events-none bd:[&_svg]:shrink-0 bd:[&_svg:not([class*=size-])]:size-4',
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="bd:pointer-events-none bd:absolute bd:left-2 bd:flex bd:size-3.5 bd:items-center bd:justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="bd:size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        'bd:focus:bg-accent bd:focus:text-accent-foreground bd:relative bd:flex bd:cursor-default bd:items-center bd:gap-2 bd:rounded-sm bd:py-1.5 bd:pr-2 bd:pl-8 bd:text-sm bd:outline-hidden bd:select-none bd:data-[disabled]:pointer-events-none bd:data-[disabled]:opacity-50 bd:[&_svg]:pointer-events-none bd:[&_svg]:shrink-0 bd:[&_svg:not([class*=size-])]:size-4',
        className
      )}
      {...props}
    >
      <span className="bd:pointer-events-none bd:absolute bd:left-2 bd:flex bd:size-3.5 bd:items-center bd:justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className="bd:size-2 bd:fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        'bd:px-2 bd:py-1.5 bd:text-sm bd:font-medium bd:data-[inset]:pl-8',
        className
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn('bd:bg-border bd:-mx-1 bd:my-1 bd:h-px', className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        'bd:text-muted-foreground bd:ml-auto bd:text-xs bd:tracking-widest',
        className
      )}
      {...props}
    />
  );
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        'bd:focus:bg-accent bd:focus:text-accent-foreground bd:data-[state=open]:bg-accent bd:data-[state=open]:text-accent-foreground bd:flex bd:cursor-default bd:items-center bd:rounded-sm bd:px-2 bd:py-1.5 bd:text-sm bd:outline-hidden bd:select-none bd:data-[inset]:pl-8',
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="bd:ml-auto bd:size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        'bd:bg-popover bd:text-popover-foreground bd:data-[state=open]:animate-in bd:data-[state=closed]:animate-out bd:data-[state=closed]:fade-out-0 bd:data-[state=open]:fade-in-0 bd:data-[state=closed]:zoom-out-95 bd:data-[state=open]:zoom-in-95 bd:data-[side=bottom]:slide-in-from-top-2 bd:data-[side=left]:slide-in-from-right-2 bd:data-[side=right]:slide-in-from-left-2 bd:data-[side=top]:slide-in-from-bottom-2 bd:z-50 bd:min-w-[8rem] bd:origin-(--radix-dropdown-menu-content-transform-origin) bd:overflow-hidden bd:rounded-md bd:border bd:p-1 bd:shadow-lg',
        className
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
