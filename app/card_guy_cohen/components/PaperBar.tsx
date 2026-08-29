"use client";

import { motion } from "motion/react";
import { QrCode } from "lucide-react";
import { person } from "../data";
import { press, rise } from "../motion";

/** The white letterhead strip: brand mark on the start edge, share on the end. */
export function PaperBar({ onShare }: { onShare: () => void }) {
  return (
    <motion.header
      variants={rise}
      className="glc-card relative z-30 flex shrink-0 items-center justify-between gap-3 px-[var(--glc-gutter)] pt-[max(14px,env(safe-area-inset-top))] pb-3"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={person.logo}
        alt={person.org}
        draggable={false}
        className="h-10 w-auto select-none"
      />

      <motion.button
        type="button"
        onClick={onShare}
        whileTap={press}
        className="glc-chip flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold tracking-wide"
      >
        <QrCode className="h-4 w-4" />
        שיתוף
      </motion.button>
    </motion.header>
  );
}
