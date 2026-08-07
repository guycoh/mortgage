"use client";

// WHICH INSTRUMENT IS ON THE DESK.
//
// Both tools are always on screen and the filled one is where you are. The
// fill is a single element carried between the two buttons by Motion's
// layoutId, so switching is one object travelling rather than two states
// blinking — you see the control move, which is what makes the view change
// underneath it read as the same page rather than a different one.
//
// Press is the system's spring (lib/transitions), the ink crosses in CSS, and
// nothing here loops.

import { motion } from "motion/react";
import { Table } from "@phosphor-icons/react";
import ReverseMark from "../reverse/mark";
import { snap } from "../lib/transitions";

export type Tool = "mix" | "reverse";

/** In RTL the first item is the rightmost, so this is the order it reads. */
const ITEMS: { id: Tool; label: string; icon: React.ReactNode }[] = [
  { id: "mix", label: "סימולטור תמהילים", icon: <Table size={15} weight="fill" className="lgr-switch-ico" /> },
  {
    id: "reverse",
    label: "משכנתא הפוכה",
    icon: (
      <span className="lgr-switch-ico" style={{ display: "grid", placeItems: "center" }}>
        <ReverseMark size={16} />
      </span>
    ),
  },
];

export default function ToolSwitch({
  value,
  onChange,
  onPreload,
  className = "",
}: {
  value: Tool;
  onChange: (t: Tool) => void;
  /** Warm the other tool's chunk while the pointer is still travelling. */
  onPreload?: (t: Tool) => void;
  className?: string;
}) {
  return (
    <div className={`lgr-switch${className ? ` ${className}` : ""}`} role="tablist" aria-label="בחירת כלי">
      {ITEMS.map((it) => {
        const on = it.id === value;
        return (
          <motion.button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={on}
            className="lgr-switch-item"
            data-on={on}
            onClick={() => onChange(it.id)}
            onPointerEnter={() => onPreload?.(it.id)}
            onFocus={() => onPreload?.(it.id)}
            whileTap={{ scale: 0.97 }}
            transition={snap}
          >
            {on && (
              <motion.span
                layoutId="lgr-switch-pill"
                className="lgr-switch-pill"
                // Stiff enough to arrive with the view, soft enough to carry a
                // little weight on the way — the fill is the heaviest thing
                // moving in the header and it should read that way.
                transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.9 }}
              />
            )}
            <span className="lgr-switch-in">
              {it.icon}
              {it.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
