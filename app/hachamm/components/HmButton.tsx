"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

type Variant = "primary" | "ghost" | "quiet";
type Size = "sm" | "md" | "lg";

type Props = {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  icon?: ReactNode;
  className?: string;
  fullWidth?: boolean;
};

const SIZES: Record<Size, string> = {
  sm: "h-10 px-4 text-[13px] rounded-[11px]",
  md: "h-12 px-5 text-[15px] rounded-[13px]",
  lg: "h-14 px-6 text-[16px] rounded-[15px]",
};

/**
 * The brand button for every /hachamm screen.
 *
 * The calculators used to import /home's CustomButton — another brand's
 * component, with a fixed 160px width that wrapped on a 390px phone and a
 * hover effect that widened letter-spacing (so the label reflowed on every
 * hover). This one is fluid, has a real pressed state, and keeps its
 * physics: the shadow collapses and the face sinks 1px on tap, which is
 * what makes a button feel tactile rather than animated.
 */
export function HmButton({
  children,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  icon,
  className = "",
  fullWidth = false,
}: Props) {
  const base =
    "relative isolate inline-flex select-none items-center justify-center gap-2 overflow-hidden font-bold outline-none transition-colors " +
    "focus-visible:ring-2 focus-visible:ring-[var(--hm-gold-300)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent " +
    "disabled:cursor-not-allowed disabled:opacity-50";

  const variants: Record<Variant, string> = {
    // gold pigment, lit from the top edge, seated on a warm shadow
    primary:
      "text-[#fffaea] bg-[linear-gradient(180deg,var(--hm-gold-500)_0%,var(--hm-gold-700)_100%)] " +
      "shadow-[inset_0_1px_0_rgba(255,249,224,0.35),0_6px_14px_-6px_rgba(66,55,17,0.65)]",
    // paper with a gold hairline — the secondary action
    ghost:
      "text-[var(--hm-gold-700)] bg-[var(--hm-paper)] " +
      "shadow-[inset_0_0_0_1px_var(--hm-gold-200),0_4px_10px_-6px_rgba(66,55,17,0.35)] " +
      "hover:bg-[var(--hm-gold-50)]",
    // lowest emphasis, for use on top of the gold device itself
    quiet:
      "text-[#fffaea] bg-[rgba(255,250,226,0.14)] " +
      "shadow-[inset_0_0_0_1px_rgba(255,250,226,0.28)] hover:bg-[rgba(255,250,226,0.22)]",
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.975, y: 1 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      className={`${base} ${variants[variant]} ${SIZES[size]} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {icon}
      {children}
    </motion.button>
  );
}
