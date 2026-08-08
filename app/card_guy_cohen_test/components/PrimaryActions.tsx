"use client";

import { motion } from "motion/react";
import { BookOpenText, UserPlus } from "lucide-react";
import { guideHref } from "../data";
import { press, rise } from "../motion";

export function PrimaryActions({ onSaveContact }: { onSaveContact: () => void }) {
  return (
    <motion.div variants={rise} className="grid grid-cols-2 gap-2.5">
      <motion.button
        type="button"
        onClick={onSaveContact}
        whileTap={press}
        className="glc-foil glc-sweep glc-btn-foil glc-press relative isolate flex h-[clamp(46px,6.4svh,52px)] items-center justify-center gap-2 overflow-hidden rounded-[14px] text-[13px] font-bold"
      >
        <UserPlus className="h-[17px] w-[17px]" />
        הוספה לאנשי קשר
      </motion.button>

      <motion.a
        href={guideHref}
        whileTap={press}
        className="glc-btn-ghost flex h-[clamp(46px,6.4svh,52px)] items-center justify-center gap-2 rounded-[14px] text-[13px] font-bold"
      >
        <BookOpenText className="h-[17px] w-[17px]" />
        מדריך דוח יתרות
      </motion.a>
    </motion.div>
  );
}
