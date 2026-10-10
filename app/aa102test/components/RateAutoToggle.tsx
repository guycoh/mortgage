"use client";

// ריבית אוטומטית — the switch on the ריבית field's corner.
//
// Green: the rate IS עוגן + תוספת and follows them. Red: the advisor typed it —
// a quiet red outline when the typed figure agrees with the sum, a solid red
// disc when it does not (the field beside it turns red too).

import { useState } from "react";
import { Calculator } from "@phosphor-icons/react";

export default function RateAutoToggle({
  on,
  anchor,
  margin,
  rate,
  onToggle,
}: {
  on: boolean;
  anchor: number | null;
  margin: number | null;
  rate: number;
  onToggle: () => void;
}) {
  const sum = anchor === null ? null : Math.round((anchor + (margin ?? 0)) * 100) / 100;
  const off = sum !== null && !on && rate > 0 && Math.abs(rate - sum) >= 0.005 ? rate - sum : null;
  const state = on ? "on" : off !== null ? "mismatch" : "off";
  // Motion answers the click and nothing else: a board of thirty rows must not
  // pop thirty badges on load. Once pressed, each state change replays the pop.
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      className="lgr-rate-auto"
      data-state-auto={state}
      data-pressed={pressed || undefined}
      aria-pressed={on}
      aria-label={on ? "ריבית מחושבת: עוגן ועוד תוספת. לחיצה למעבר להזנה ידנית" : "ריבית בהזנה ידנית. לחיצה לחישוב אוטומטי"}
      onClick={() => {
        setPressed(true);
        onToggle();
      }}
    >
      <Calculator key={on ? "on" : "off"} size={11} weight={on ? "fill" : "bold"} />
    </button>
  );
}
