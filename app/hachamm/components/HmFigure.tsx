"use client";

import NumberFlow from "@number-flow/react";

type Props = {
  value: number;
  /** shekels by default; pass false for a plain count */
  currency?: boolean;
  decimals?: number;
  className?: string;
};

/**
 * A result figure that animates digit-by-digit when the number changes.
 *
 * These calculators recompute on every keystroke, so a figure that simply
 * swaps text reads as a flicker. NumberFlow tweens the digits that actually
 * changed, which makes the cause and effect legible — and it honours
 * prefers-reduced-motion internally, falling back to a plain swap.
 */
export function HmFigure({ value, currency = true, decimals = 0, className = "" }: Props) {
  const safe = Number.isFinite(value) ? value : 0;

  return (
    <NumberFlow
      value={safe}
      locales="he-IL"
      format={
        currency
          ? {
              style: "currency",
              currency: "ILS",
              maximumFractionDigits: decimals,
              minimumFractionDigits: decimals,
            }
          : { maximumFractionDigits: decimals, minimumFractionDigits: decimals }
      }
      className={className}
    />
  );
}
