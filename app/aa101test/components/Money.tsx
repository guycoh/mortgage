"use client";

// One place decides how money looks.
//
// The shekel mark sits to the LEFT of the digits everywhere on this page. That
// needs a bidi isolate: inside an RTL page a bare "₪" next to a number gets
// reordered by the bidi algorithm and lands on whichever side the surrounding
// text pushes it. `dir="ltr"` + `unicode-bidi: isolate` pins it.
//
// The box is LTR but text-aligned right, so the units digit of every row lands
// on the same pixel — the column still reads as a ledger — while the ₪ leads.

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export const fmt = (n: number) =>
  Math.round(Number(n) || 0).toLocaleString("he-IL", { maximumFractionDigits: 0 });

/**
 * A FIGURE THAT JUST RECALCULATED gets one quiet beat of the ink behind it.
 *
 * Editing one row changes the row's own payment, its family subtotal and the
 * grand total, all at once and all off-screen from where the cursor is. The
 * pulse is how you see that the edit landed somewhere other than under your
 * hands. It never fires on first paint — only on a change to an already-shown
 * figure — so loading a mix does not set the whole sheet flashing.
 */
function usePulse(value: number) {
  const [on, setOn] = useState(false);
  const prev = useRef<number | null>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = value;
    if (before === null || before === value) return;
    setOn(true);
    const t = setTimeout(() => setOn(false), 640);
    return () => clearTimeout(t);
  }, [value]);
  return on;
}

export default function Money({
  value,
  className = "",
  style,
  size,
  weight,
  color,
  per,
  block = true,
  sign,
  hot,
}: {
  value: number;
  className?: string;
  style?: CSSProperties;
  size?: number;
  weight?: number;
  color?: string;
  /** Trailing period marker, e.g. "ח׳" for a monthly figure. */
  per?: ReactNode;
  block?: boolean;
  /** Force a leading + on positive numbers (difference columns). */
  sign?: boolean;
  /** Marks the one figure in a group that carries the most weight. */
  hot?: boolean;
}) {
  const v = Number(value) || 0;
  const lead = sign && v > 0 ? "+" : v < 0 ? "−" : "";
  const pulse = usePulse(Math.round(v));
  return (
    <span
      dir="ltr"
      data-hot={hot || undefined}
      data-pulse={pulse || undefined}
      className={`ink-money${block ? " ink-money-block" : ""}${className ? ` ${className}` : ""}`}
      style={{ fontSize: size, fontWeight: weight, color, ...style }}
    >
      <span className="ink-cur">₪</span>
      {lead}
      {fmt(Math.abs(v))}
      {per && <span className="ink-per">/{per}</span>}
    </span>
  );
}
