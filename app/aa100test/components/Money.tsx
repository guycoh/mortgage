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

import type { CSSProperties, ReactNode } from "react";

export const fmt = (n: number) =>
  Math.round(Number(n) || 0).toLocaleString("he-IL", { maximumFractionDigits: 0 });

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
  return (
    <span
      dir="ltr"
      data-hot={hot || undefined}
      className={`fin-money${block ? " fin-money-block" : ""}${className ? ` ${className}` : ""}`}
      style={{ fontSize: size, fontWeight: weight, color, ...style }}
    >
      <span className="fin-cur">₪</span>
      {lead}
      {fmt(Math.abs(v))}
      {per && <span className="fin-per">/{per}</span>}
    </span>
  );
}
