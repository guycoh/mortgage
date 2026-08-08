"use client";

// WHICH INSTRUMENT IS ON THE DESK.
//
// Built as application chrome rather than as a control inside the page: a band
// of tabs above the title, the way a product with more than one tool announces
// them. Both are always on screen and the filled one is where you are.
//
// The state is carried by TWO objects that MOVE rather than blink — a tinted
// field and the rule under it, both Motion layoutId, both on the same spring.
// One tab lighting up as another goes out reads as two buttons that happen to
// be adjacent; a fill that travels reads as one switch with a position, and it
// is what ties the tab to the surface changing underneath it.
//
// A tab can also CARRY STATE for a view you are not looking at: the `marks`
// prop puts an editor's unsaved-dot on a tab, so crossing to the other tool
// does not mean forgetting that this one has work uncommitted. The dot is the
// save button's own violet — it marks the thing that button commits.
//
// And it is a real tablist: one tab stop for the whole control, arrows move
// between tools (selection follows focus, per the ARIA tabs pattern), Home and
// End jump. The arrows are wired for the RTL row this lives in.

import { useRef } from "react";
import { motion } from "motion/react";
import { Stack } from "@phosphor-icons/react";
import ReverseMark from "../reverse/mark";
import AbilityMark from "../ability/mark";
import { snap } from "../lib/transitions";
// The list and the ?tool= parser live in a directive-free module, because the
// server components that resolve a deep link cannot import from this one.
import { TOOLS, type Tool } from "../lib/tools";

export type { Tool };

/** In RTL the first item is the rightmost, so this is the order it reads —
 *  the same order TOOLS declares, checked at build time by the Record. */
const LABEL: Record<Tool, { label: string; icon: (on: boolean) => React.ReactNode }> = {
  mix: { label: "תמהילים", icon: (on) => <Stack size={17} weight={on ? "fill" : "regular"} /> },
  reverse: { label: "משכנתא הפוכה", icon: () => <ReverseMark size={17} /> },
  ability: { label: "משכנתא חדשה", icon: () => <AbilityMark size={17} /> },
};

const ITEMS = TOOLS.map((id) => ({ id, ...LABEL[id] }));

/** The fill and its rule travel together. Stiff enough to arrive with the view
 *  it selects, soft enough to carry a little weight on the way. */
const TRAVEL = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.9 };

export default function ToolSwitch({
  value,
  onChange,
  onPreload,
  marks,
  className = "",
}: {
  value: Tool;
  onChange: (t: Tool) => void;
  /** Warm the other tool's chunk while the pointer is still travelling. */
  onPreload?: (t: Tool) => void;
  /** Tabs that should carry the unsaved-dot — state worth remembering from
   *  across the room. */
  marks?: Partial<Record<Tool, boolean>>;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (e: React.KeyboardEvent) => {
    const i = ITEMS.findIndex((x) => x.id === value);
    let next = -1;
    // RTL: the row reads right-to-left, so ArrowLeft advances and ArrowRight
    // goes back — the arrow moves focus the way it points on screen.
    if (e.key === "ArrowLeft") next = (i + 1) % ITEMS.length;
    else if (e.key === "ArrowRight") next = (i - 1 + ITEMS.length) % ITEMS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = ITEMS.length - 1;
    if (next < 0 || next === i) return;
    e.preventDefault();
    onChange(ITEMS[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div
      className={`lgr-nav-tabs${className ? ` ${className}` : ""}`}
      role="tablist"
      aria-label="בחירת כלי"
      onKeyDown={move}
    >
      {ITEMS.map((it, i) => {
        const on = it.id === value;
        const marked = !on && !!marks?.[it.id];
        return (
          <motion.button
            key={it.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={on}
            // one tab stop for the whole tablist; arrows do the rest
            tabIndex={on ? 0 : -1}
            className="lgr-nav-tab"
            data-on={on}
            title={marked ? "יש שינויים שלא נשמרו" : undefined}
            onClick={() => onChange(it.id)}
            onPointerEnter={() => onPreload?.(it.id)}
            onFocus={() => onPreload?.(it.id)}
            whileTap={{ scale: 0.975 }}
            transition={snap}
          >
            {on && (
              <>
                <motion.span layoutId="lgr-nav-tint" className="lgr-nav-tint" transition={TRAVEL} />
                <motion.span layoutId="lgr-nav-rule" className="lgr-nav-rule" transition={TRAVEL} />
              </>
            )}
            <span className="lgr-nav-in">
              {/* One step forward as the tab becomes current — keyed on `on`, so
                  it fires on the change and never on first paint of the tab
                  that is merely already selected. */}
              <motion.span
                key={String(on)}
                className="lgr-nav-ico"
                initial={on ? { scale: 0.82 } : false}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 520, damping: 24 }}
              >
                {it.icon(on)}
              </motion.span>
              {it.label}
              {/* THE UNSAVED DOT — an editor's mark, in the save button's own
                  violet, and only ever on a tab you are NOT on: standing on the
                  mix, the save button itself is in view and the dot would be a
                  second voice saying the same thing. It pops in on a spring so
                  its arrival is felt at the edge of vision, and it never
                  unmounts mid-flight — the exit is the tab being visited. */}
              {marked && (
                <motion.span
                  className="lgr-nav-dot"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                  aria-hidden
                />
              )}
              {marked && <span className="sr-only">יש שינויים שלא נשמרו</span>}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
