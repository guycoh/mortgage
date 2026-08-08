"use client";

import { motion } from "motion/react";
import { ChevronLeft } from "lucide-react";
import { person, wazeUrl } from "../data";
import { WazeIcon } from "../icons";
import { press, rise } from "../motion";

export function LocationRow() {
  return (
    <motion.a
      variants={rise}
      href={wazeUrl}
      target="_blank"
      rel="noopener noreferrer"
      whileTap={press}
      className="glc-loc flex items-center gap-3 rounded-[14px] px-2.5 py-[clamp(8px,1.35svh,10px)]"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--glc-paper)] text-[var(--glc-gold-600)] shadow-[0_0_0_1px_var(--glc-gold-200)]">
        <WazeIcon className="h-6 w-6" />
      </span>

      <span className="min-w-0 flex-1 text-start">
        <span className="block text-[10px] font-semibold tracking-[0.2em] text-[var(--glc-gold-600)]">
          המשרד
        </span>
        <span className="mt-0.5 block truncate text-[13.5px] font-bold leading-tight text-[var(--glc-ink)]">
          {person.street}, {person.city}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-[var(--glc-ink-faint)]">
        ניווט
        <ChevronLeft aria-hidden className="h-3.5 w-3.5 text-[var(--glc-gold-300)]" />
      </span>
    </motion.a>
  );
}
