"use client";

// סיכום ללקוח on /aa105test — the brief, presented full-screen, with the one
// action that belongs here: sending it to the client.
//
// Takes either document's analysis; the brief is built once on open (the
// analysis is a read of the documents, recomputing it costs nothing). Hebrew
// wording across /aa105test reviewed by Astra, 2026-10-10.

import { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import type { Analysis } from "@/app/aa102test/lib/analysis";
import type { StatementAnalysis } from "@/lib/bank-parser/analysis";
import { docFromCredit, docFromStatement } from "../lib/brief";
import BriefView, { SECTIONS } from "./BriefView";
import ShareBriefDialog from "./ShareBriefDialog";
import Stage from "./Stage";

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
  const doc = useMemo(
    () => (credit ? docFromCredit(credit) : statement ? docFromStatement(statement) : null),
    [credit, statement]
  );
  const [sharing, setSharing] = useState(false);
  if (!doc) return null;

  return (
    <Stage
      label="סיכום ללקוח"
      who={
        <>
          {doc.who || (doc.source === "credit" ? "סיכום החובות" : "סיכום המשכנתא")}
          {doc.asOf && <span className="brf-bar-date">{doc.asOf}</span>}
        </>
      }
      tabs={SECTIONS.map((s) => ({ id: s.id, label: s.id === "brf-debts" && doc.source === "bank" ? "המסלולים" : s.label }))}
      onClose={onClose}
      holdEscape={sharing}
      actions={
        <button className="brf-send" onClick={() => setSharing(true)}>
          <PaperPlaneTilt size={16} weight="fill" />
          <span className="brf-send-text">שליחה ללקוח</span>
        </button>
      }
      overlay={<AnimatePresence>{sharing && <ShareBriefDialog doc={doc} leadId={leadId} onClose={() => setSharing(false)} />}</AnimatePresence>}
    >
      <BriefView doc={doc} mode="present" />
    </Stage>
  );
}
