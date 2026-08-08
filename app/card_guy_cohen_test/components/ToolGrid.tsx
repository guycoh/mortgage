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
          className="glc-display text-[20px] font-bold leading-none text-[var(--glc-ink)]"
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
            className="glc-tile flex items-center gap-2.5 rounded-[15px] px-2.5 py-[clamp(9px,1.5svh,11px)]"
          >
            <span className="glc-disc grid h-9 w-9 shrink-0 place-items-center rounded-[11px]">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 flex-1 text-start">
              <span className="block truncate text-[14px] font-bold leading-tight text-[var(--glc-ink)]">
                {label}
              </span>
              <span className="mt-0.5 block truncate text-[11.5px] leading-tight text-[var(--glc-ink-faint)]">
                {hint}
              </span>
            </span>
          </motion.a>
        ))}
      </div>
    </motion.section>
  );
}
