// The page has exactly two springs, and everything that moves uses one of them.
//
// Why springs rather than durations: a duration says "this takes 200ms" and a
// spring says "this has mass". Under a finger, mass is what reads as physical —
// the release overshoot on a pressed button is the whole difference between a
// control that feels machined and one that feels like a picture of a control.
//
// The division of labour with CSS is strict, and it matters:
//   CSS owns  — hover (background, border, shadow, the 1px lift), focus rings
//   Motion owns — press, presence (enter/exit), layout, count-ups
// Nothing is animated by both. Two systems writing `transform` on one element
// is how you get a button that sticks down.
//
// HARD RULE: nothing here loops. Every one of these fires because a person did
// something. There is no idle float, no ambient pulse, no shimmer.

import type { Transition } from "motion/react";

/**
 * SNAP — press feedback, toggles, chips.
 * Stiff and well damped: it arrives inside ~120ms and settles with just enough
 * overshoot on release to feel like something let go.
 */
export const snap: Transition = { type: "spring", stiffness: 500, damping: 30 };

/**
 * SETTLE — cards, panels, dropdowns, layout shifts.
 * Softer and slower, because a surface the size of a menu that arrives as fast
 * as a button reads as a jump cut rather than a movement.
 */
export const settle: Transition = { type: "spring", stiffness: 260, damping: 26 };

/** The press gesture every control shares. Spread into a Motion component. */
export const press = {
  whileTap: { scale: 0.97 },
  transition: snap,
} as const;

/**
 * The one page-load move: a top-to-bottom stagger, 40ms apart, run once.
 * `i` is the block's index down the page.
 */
export const rise = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { ...settle, delay: i * 0.04 },
});
