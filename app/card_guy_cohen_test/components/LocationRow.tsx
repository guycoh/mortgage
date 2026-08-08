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
      className="glc-loc flex items-center gap-3 rounded-[15px] px-2.5 py-[clamp(9px,1.5svh,11px)]"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--glc-paper)] text-[var(--glc-gold-600)] shadow-[0_0_0_1px_var(--glc-gold-200)]">
        <WazeIcon className="h-[26px] w-[26px]" />
      </span>

      <span className="min-w-0 flex-1 text-start">
        <span className="block text-[10.5px] font-semibold tracking-[0.2em] text-[var(--glc-gold-600)]">
          המשרד
        </span>
        <span className="mt-0.5 block truncate text-[15px] font-bold leading-tight text-[var(--glc-ink)]">
          {person.street}, {person.city}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-0.5 text-[12px] font-semibold text-[var(--glc-ink-faint)]">
        ניווט
        <ChevronLeft aria-hidden className="h-4 w-4 text-[var(--glc-gold-300)]" />
      </span>
    </motion.a>
  );
}
