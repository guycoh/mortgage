import type { Variants } from "motion/react";

const ease = [0.16, 1, 0.3, 1] as const;

/** One orchestrated page load beats a dozen scattered micro-animations. */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.075, delayChildren: 0.08 } },
};

export const rise: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.62, ease } },
};

export const settle: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.7, ease } },
};

export const press = { scale: 0.975 } as const;
