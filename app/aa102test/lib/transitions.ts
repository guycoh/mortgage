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

/**
 * COLLAPSE — a block entering or leaving the page's flow, taking its height
 * with it and moving everything below.
 *
 * A tween, not a spring, and this is the one place that matters: a spring's
 * overshoot on `height` bounces every pixel of the page underneath, which reads
 * as a glitch rather than as mass. The opacity leaves early and arrives late so
 * the block is already faint by the time the reflow is obvious.
 */
export const collapse: Transition = {
  height: { duration: 0.34, ease: [0.2, 0, 0, 1] },
  opacity: { duration: 0.19, ease: "easeOut" },
  y: { duration: 0.32, ease: [0.2, 0, 0, 1] },
  scale: { duration: 0.32, ease: [0.2, 0, 0, 1] },
};

/**
 * COLLAPSE, LEAVING — the same move, on a different curve, and the asymmetry is
 * deliberate.
 *
 * Only part of a collapse is visible: a block 90px tall sitting beside one 56px
 * tall stops moving the page the moment it drops below 56. That is the top 38%
 * of its travel. On the way in, the standard decelerating curve spends most of
 * its time there and the entrance reads beautifully. On the way out the same
 * curve tears through it in about 90ms and the page below still snaps.
 *
 * So the exit eases in and out instead, which puts roughly 170ms into the
 * stretch that actually moves anything, and the opacity holds before it goes
 * rather than leaving first — you see the strip leave, not a gap close.
 */
export const collapseOut: Transition = {
  height: { duration: 0.4, ease: [0.62, 0, 0.36, 1] },
  opacity: { duration: 0.24, ease: "easeIn" },
  y: { duration: 0.36, ease: [0.62, 0, 0.36, 1] },
  scale: { duration: 0.36, ease: [0.62, 0, 0.36, 1] },
};

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

/**
 * ALREADY THERE.
 *
 * The counterpart to `rise`, for when the whole view is arriving as one object
 * — switching between the two tools moves the entire surface, and blocks that
 * also staggered themselves inside it would be two animations of the same
 * pixels. The page-load stagger belongs to the page load; a tool switch gets
 * the view's own move and nothing else.
 */
export const still = { initial: false as const, animate: { opacity: 1, y: 0 } };

/** How a block enters: staggered on first paint, settled on a tool switch. */
export type Enter = (i: number) => typeof still | ReturnType<typeof rise>;

/**
 * THE VIEW CHANGE.
 *
 * Quieter than a page transition on purpose: the switch's travelling fill is
 * the event, and the surface underneath should read as the same desk with a
 * different instrument set down on it. So the exit is a plain 120ms dissolve,
 * and the entry is a dissolve with 8px of drift from the side the chosen
 * switch button is on — enough to tie the surface to the fill's travel,
 * nothing anyone would call a slide. No scale, no vertical hop: a surface
 * that shrinks while leaving is a surface going somewhere, and this one
 * isn't.
 */
export const viewOut = {
  opacity: 0,
  transition: { duration: 0.12, ease: "easeIn" as const },
};
export const viewIn = (dir: -1 | 1) => ({
  initial: { opacity: 0, x: 8 * dir },
  animate: { opacity: 1, x: 0 },
  exit: viewOut,
  transition: {
    x: { duration: 0.3, ease: [0.2, 0, 0, 1] as [number, number, number, number] },
    opacity: { duration: 0.2, ease: "easeOut" as const },
  },
});
