"use client";

// Minimal self-contained primitives for the report view, so it has no external
// shadcn/ui dependency and renders with plain Tailwind classes anywhere.

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

const BADGE_STYLES: Record<BadgeVariant, string> = {
  default: "bg-[#1d75a1] text-white",
  secondary: "bg-slate-100 text-slate-600",
  outline: "border border-slate-300 text-slate-600",
  destructive: "bg-red-600 text-white",
};

export function Badge({
  variant = "default",
  className,
  children,
}: {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium leading-tight",
        BADGE_STYLES[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
