"use client";

import { motion } from "motion/react";
import { person } from "../data";
import { rise } from "../motion";

export function CardFooter() {
  return (
    <motion.footer
      variants={rise}
      className="flex items-center justify-center gap-2.5 text-[9.5px] font-semibold tracking-[0.24em] text-[var(--glc-ink-faint)]"
    >
      <span>כרטיס ביקור דיגיטלי</span>
      <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-[var(--glc-gold-300)]" />
      <span>{person.org}</span>
    </motion.footer>
  );
}
