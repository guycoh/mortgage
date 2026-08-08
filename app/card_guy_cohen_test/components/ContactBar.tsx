"use client";

import { motion } from "motion/react";
import { contactActions } from "../data";
import { press, rise } from "../motion";

/**
 * One slab, four equal cells, hairline dividers — instead of four circles
 * floating at eyeballed distances. Rides up over the foil edge.
 */
export function ContactBar() {
  return (
    <motion.nav
      variants={rise}
      aria-label="דרכי יצירת קשר"
      className="glc-slab relative z-20 -mt-[42px] grid grid-cols-4 overflow-hidden rounded-[18px]"
    >
      {contactActions.map(({ label, href, icon: Icon, external }, i) => (
        <motion.a
          key={label}
          href={href}
          whileTap={press}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="glc-cell relative flex flex-col items-center gap-1.5 py-[clamp(11px,1.8svh,14px)]"
        >
          {i > 0 && (
            <span aria-hidden className="glc-divider absolute inset-y-3 start-0 w-px" />
          )}
          <span className="glc-disc grid h-9 w-9 place-items-center rounded-full">
            <Icon className="h-[17px] w-[17px]" />
          </span>
          <span className="text-[11px] font-semibold leading-none text-[var(--glc-ink-soft)]">
            {label}
          </span>
        </motion.a>
      ))}
    </motion.nav>
  );
}
