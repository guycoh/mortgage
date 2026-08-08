"use client";

import { motion } from "motion/react";
import { tools } from "../data";
import { press, rise } from "../motion";

export function ToolGrid() {
  return (
    <motion.section variants={rise} aria-labelledby="glc-tools-title">
      <div className="mb-2.5 flex items-center gap-3">
        <h2
          id="glc-tools-title"
          className="glc-display text-[15px] font-bold leading-none text-[var(--glc-ink)]"
        >
          מחשבונים
        </h2>
        <span aria-hidden className="glc-hairline h-px flex-1" />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {tools.map(({ label, hint, href, icon: Icon }) => (
          <motion.a
            key={label}
            href={href}
            whileTap={press}
            className="glc-tile flex items-center gap-2.5 rounded-[14px] px-2.5 py-[clamp(8px,1.35svh,10px)]"
          >
            <span className="glc-disc grid h-8 w-8 shrink-0 place-items-center rounded-[10px]">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 text-start">
              <span className="block truncate text-[12px] font-bold leading-tight text-[var(--glc-ink)]">
                {label}
              </span>
              <span className="mt-px block truncate text-[10px] leading-tight text-[var(--glc-ink-faint)]">
                {hint}
              </span>
            </span>
          </motion.a>
        ))}
      </div>
    </motion.section>
  );
}
