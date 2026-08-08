"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Result panels appear the moment a calculation lands. Popping them into
 * existence makes the page feel like it jumped; a short rise + height
 * transition tells the eye where the new content came from.
 *
 * MotionConfig reducedMotion="user" in the layout disables this for anyone
 * who asked for reduced motion.
 */
export function HmReveal({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.42, ease: EASE }}
          style={{ overflow: "hidden", width: "100%" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Staggers a group of children in on mount — used for form rows. */
export function HmStagger({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } }}
    >
      {children}
    </motion.div>
  );
}

export const hmRise = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};
