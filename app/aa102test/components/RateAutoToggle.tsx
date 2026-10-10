"use client";

// ריבית אוטומטית — the switch on the ריבית field's corner, and what it says on hover.
//
// Green: the rate IS עוגן + תוספת and follows them. Red: the advisor typed it —
// a quiet red outline when the typed figure agrees with the sum, a solid red
// disc when it does not (the field beside it turns red too).
//
// The tooltip is a card in the board's own material (white, hairline, the
// lifted shadow the chart tooltips use), portalled so the table's overflow can
// never clip it. It shows the sum with the row's own numbers — the one fact the
// switch is about — and says what a click will do. No paragraph of advice.

import { useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Calculator } from "@phosphor-icons/react";

const fmt = (v: number) => v.toFixed(2);

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
    <Tooltip.Provider delayDuration={220} skipDelayDuration={120}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
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
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            align="center"
            sideOffset={8}
            collisionPadding={12}
            className="lgr-vars lgr-rtip"
            dir="rtl"
          >
            <div className="lgr-rtip-head">
              <i data-state-auto={state} />
              {on ? "ריבית אוטומטית" : "ריבית בהזנה ידנית"}
            </div>
            {sum !== null ? (
              <div className="lgr-rtip-sum" dir="ltr">
                <span>
                  <em>עוגן</em>
                  {fmt(anchor!)}
                </span>
                <b>{(margin ?? 0) < 0 ? "−" : "+"}</b>
                <span>
                  <em>תוספת</em>
                  {fmt(Math.abs(margin ?? 0))}
                </span>
                <b>=</b>
                <span data-strong>
                  <em>ריבית</em>
                  {fmt(sum)}%
                </span>
              </div>
            ) : (
              <div className="lgr-rtip-note">הזינו עוגן כדי לחשב ריבית</div>
            )}
            {off !== null && (
              <div className="lgr-rtip-warn">
                הוזנה {fmt(rate)}% · {off > 0 ? "גבוהה" : "נמוכה"} ב־{fmt(Math.abs(off))}%
              </div>
            )}
            <div className="lgr-rtip-act">{on ? "לחיצה — מעבר להזנה ידנית" : "לחיצה — חישוב אוטומטי מעוגן + תוספת"}</div>
            <Tooltip.Arrow className="lgr-rtip-arrow" width={12} height={6} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
