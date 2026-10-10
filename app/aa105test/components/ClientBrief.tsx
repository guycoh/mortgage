"use client";

// סיכום ללקוח on /aa105test — the board's client summary in a modal, drawn in
// the statement language, with the one action that belongs here: sending it.
//
// Takes either document's analysis; the summary is built once on open.

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PaperPlaneTilt, Printer, X } from "@phosphor-icons/react";
import type { Analysis } from "@/app/aa102test/lib/analysis";
import type { StatementAnalysis } from "@/lib/bank-parser/analysis";
import { docFromCredit, docFromStatement } from "../lib/brief";
import BriefView from "./BriefView";
import ShareBriefDialog from "./ShareBriefDialog";

export default function ClientBrief({
  credit,
  statement,
  leadId,
  onClose,
}: {
  credit?: Analysis;
  statement?: StatementAnalysis;
  leadId?: number | null;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const doc = useMemo(
    () => (credit ? docFromCredit(credit) : statement ? docFromStatement(statement) : null),
    [credit, statement]
  );
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !sharing && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, sharing]);

  if (!doc) return null;
  return createPortal(
    <div dir="rtl" className="brf-root brf-modal-back lgr-printable" onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="סיכום ללקוח"
        className="brf-modal-card"
        initial={{ opacity: 0, y: reduce ? 0 : 10, scale: reduce ? 1 : 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduce ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="brf-modal-bar">
          <button className="brf-send" onClick={() => setSharing(true)}>
            <PaperPlaneTilt size={16} weight="fill" />
            שליחה ללקוח
          </button>
          <div className="brf-acts">
            <button className="brf-ico" onClick={() => window.print()} aria-label="הדפסה" title="הדפסה">
              <Printer size={17} />
            </button>
            <button className="brf-ico" onClick={onClose} aria-label="סגירה" title="סגירה">
              <X size={17} weight="bold" />
            </button>
          </div>
        </div>
        <div className="brf-modal-body">
          <BriefView doc={doc} mode="present" />
        </div>
        <AnimatePresence>{sharing && <ShareBriefDialog doc={doc} leadId={leadId} onClose={() => setSharing(false)} />}</AnimatePresence>
      </motion.div>
    </div>,
    document.body
  );
}
