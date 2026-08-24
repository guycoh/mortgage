"use client";

// shadcn/ui, wired to this console.
//
// The components below are the current shadcn v4 sources with two mechanical
// changes, both forced by how this repo is set up:
//
//  1. Colours point at `cns-*` utilities instead of `card` / `muted` /
//     `border`. This project never mapped shadcn's semantic variables into
//     Tailwind v4's @theme, so `bg-card` and `border-border` generate no CSS at
//     all — components using them render transparent. Mapping them repo-wide
//     would repaint every page that already uses those classes, so the console
//     brings its own additive token set instead (app/console/theme.css).
//
//  2. Radix comes from the individual `@radix-ui/react-*` packages already in
//     package.json rather than the unified `radix-ui` package, which is not
//     installed. Adding it would touch the lockfile while another branch is
//     mid-flight in this worktree.
//
// Everything else — the structure, the variants, the data-slot attributes, the
// focus rings — is upstream.

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ button */

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-cns-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-cns-primary text-cns-primaryfg hover:bg-cns-primary/90",
        outline:
          "border border-cns-line bg-cns-card text-cns-fg2 shadow-xs hover:bg-cns-muted hover:text-cns-fg",
        ghost: "text-cns-fg2 hover:bg-cns-muted hover:text-cns-fg",
        subtle: "bg-cns-muted text-cns-fg2 hover:bg-cns-line/70 hover:text-cns-fg",
        destructive: "bg-cns-bad text-white hover:bg-cns-bad/90",
        link: "text-cns-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-xs": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3.5",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------- badge */

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-[color,box-shadow] [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-cns-primary text-cns-primaryfg",
        secondary: "bg-cns-muted text-cns-fg2",
        outline: "border-cns-line text-cns-fg2",
        good: "bg-cns-good/10 text-cns-good",
        warn: "bg-cns-warn/12 text-cns-warn",
        bad: "bg-cns-bad/10 text-cns-bad",
      },
    },
    defaultVariants: { variant: "secondary" },
  }
);

export function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

/* -------------------------------------------------------------------- card */

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col rounded-xl border border-cns-line bg-cns-card text-cns-fg shadow-[0_1px_2px_rgba(12,22,34,0.04)]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "flex items-center gap-3 px-4 py-3 has-data-[slot=card-action]:justify-between",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-[13.5px] leading-none font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-[11.5px] text-cns-mutedfg", className)}
      {...props}
    />
  );
}

export function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("ms-auto flex items-center gap-2", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-4 pb-4", className)} {...props} />;
}

/* ------------------------------------------------------------------- input */

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-md border border-cns-line bg-cns-muted px-3 py-1 text-[12.5px] text-cns-fg shadow-xs transition-[color,box-shadow,background-color] outline-none",
        "placeholder:text-cns-mutedfg selection:bg-cns-accent selection:text-white",
        "focus-visible:border-cns-ring focus-visible:bg-cns-card focus-visible:ring-[3px] focus-visible:ring-cns-ring/20",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

/* --------------------------------------------------------------- separator */

export function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-cns-line data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------- table */

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <table
      data-slot="table"
      className={cn("w-full caption-bottom border-collapse text-[12.5px]", className)}
      {...props}
    />
  );
}

export function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn("", className)} {...props} />;
}

export function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-cns-line transition-colors hover:bg-cns-muted/70 data-[state=selected]:bg-cns-muted",
        className
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        // A heavier rule under the head than between rows: the header is a
        // masthead for the column, not just another row.
        "sticky top-0 z-10 h-9 border-b-2 border-cns-line2 bg-cns-card px-3 text-start align-middle text-[11.5px] font-semibold whitespace-nowrap text-cns-fg2 select-none",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-3 py-2 align-middle whitespace-nowrap text-cns-fg2", className)}
      {...props}
    />
  );
}

/* ----------------------------------------------------------------- tooltip */

export function TooltipProvider({
  delayDuration = 120,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />;
}

export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md bg-cns-fg px-2.5 py-1 text-[11.5px] text-balance text-white",
          "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

/* ---------------------------------------------------------------- skeleton */

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-cns-muted", className)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ extras */

/**
 * A segmented control. Not upstream — shadcn's toggle-group needs a Radix
 * package this repo does not have — but it follows the same variant/data-slot
 * shape as everything above.
 */
export function Segmented({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="segmented"
      role="group"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-cns-line bg-cns-muted p-0.5",
        className
      )}
      {...props}
    />
  );
}

export function SegmentedItem({
  className,
  active,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      data-slot="segmented-item"
      data-state={active ? "on" : "off"}
      aria-pressed={active}
      className={cn(
        "h-7 rounded-[6px] px-2.5 text-[12px] font-medium transition-colors outline-none",
        "focus-visible:ring-[3px] focus-visible:ring-cns-ring/30",
        active
          ? "bg-cns-card text-cns-fg shadow-[0_1px_2px_rgba(12,22,34,0.08)]"
          : "text-cns-mutedfg hover:text-cns-fg",
        className
      )}
      {...props}
    />
  );
}

export { buttonVariants, badgeVariants };
