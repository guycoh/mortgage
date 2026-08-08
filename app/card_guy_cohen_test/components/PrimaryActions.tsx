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
        className="glc-orb glc-btn-pigment glc-press relative isolate flex h-[clamp(52px,7svh,58px)] items-center justify-center gap-2 overflow-hidden rounded-[15px] text-[15.5px] font-bold"
      >
        <UserPlus className="h-[19px] w-[19px]" />
        הוספה לאנשי קשר
      </motion.button>

      <motion.a
        href={guideHref}
        whileTap={press}
        className="glc-btn-ghost flex h-[clamp(52px,7svh,58px)] items-center justify-center gap-2 rounded-[15px] text-[15.5px] font-bold"
      >
        <BookOpenText className="h-[19px] w-[19px]" />
        מדריך דוח יתרות
      </motion.a>
    </motion.div>
  );
}
