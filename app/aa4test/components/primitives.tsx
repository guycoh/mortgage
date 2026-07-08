"use client";

import { useEffect, useId, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { shekel } from "../lib/calc";

/* ---------------------------------------------------------------------------
   Money — eases from its previous value to the next, writing straight to the
   DOM node each frame (no per-frame React re-render). First mount counts up
   from zero as a reveal; later edits interpolate from the current value.
   Rendered in IBM Plex Mono (tabular) via .aa4-fig.
--------------------------------------------------------------------------- */
export function Money({
  value,
  format = shekel,
  className,
  duration = 0.8,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) {
      if (ref.current) ref.current.textContent = format(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = format(v);
      },
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, duration, format, reduce]);
  return (
    <span ref={ref} className={cn("aa4-fig", className)}>
      {format(value)}
    </span>
  );
}

/* A framed money input with a ₪ affix, grouped thousands, RTL-correct. */
export function MoneyField({
  label,
  hint,
  value,
  onChange,
  placeholder = "0",
}: {
  label: string;
  hint?: React.ReactNode;
  value: number;
  onChange: (n: number) => void;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="aa4-label flex items-baseline gap-1.5">
        {label}
        {hint && <span className="text-[11px] font-normal text-[var(--ink-3)]">{hint}</span>}
      </label>
      <div className="aa4-field-affix">
        <span className="aa4-affix">₪</span>
        <input
          id={id}
          inputMode="numeric"
          className="aa4-field aa4-field-num text-right"
          placeholder={placeholder}
          value={value ? value.toLocaleString("en-US") : ""}
          onChange={(e) => onChange(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
        />
      </div>
    </div>
  );
}

/* A plain framed field (e.g. age). */
export function PlainField({
  label,
  value,
  onChange,
  placeholder,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  max?: number;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="aa4-label">
        {label}
      </label>
      <input
        id={id}
        inputMode="numeric"
        className="aa4-field aa4-field-num text-right"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          const v = e.target.value.replace(/[^\d]/g, "");
          if (max && Number(v) > max) return;
          onChange(v);
        }}
      />
    </div>
  );
}

/* Tone-aware summary statistic: an icon medallion + label + figure. Rendered as
   a row in a divided list (no nested cards, no flat tint boxes). */
const STAT_TONES = {
  brand: { fg: "var(--brand-deep)", tint: "var(--brand-tint)" },
  neg: { fg: "var(--neg-strong)", tint: "var(--neg-tint)" },
  pos: { fg: "var(--pos-strong)", tint: "var(--pos-tint)" },
  loan: { fg: "var(--cat-loan)", tint: "var(--cat-loan-tint)" },
} as const;

export function Stat({
  label,
  value,
  tone = "brand",
  icon,
  sub,
}: {
  label: string;
  value: number;
  tone?: keyof typeof STAT_TONES;
  icon?: React.ReactNode;
  sub?: React.ReactNode;
}) {
  const t = STAT_TONES[tone];
  return (
    <div className="flex items-center gap-3 py-3.5">
      <span
        className="grid size-11 shrink-0 place-items-center rounded-[var(--r-control)]"
        style={{ background: t.tint, color: t.fg, boxShadow: "inset 0 0 0 1px rgba(15,32,40,0.04)" }}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11.5px] font-semibold text-[var(--ink-3)]">{label}</div>
        <div className="mt-0.5 aa4-fig text-[1.55rem] font-semibold leading-none" style={{ color: t.fg }}>
          <Money value={value} />
        </div>
        {sub}
      </div>
    </div>
  );
}
