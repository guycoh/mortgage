"use client";

// A QUESTION THE BOARD HAS TO ASK, IN THE BOARD'S OWN VOICE.
//
// Two of these were `window.confirm()`. That dialog is not neutral: it is a grey
// OS slab captioned "localhost:3500 says", with two English buttons that mean
// nothing about the decision, so the meaning had to be written out underneath
// in three lines of Hebrew prose — "אם אלה בני זוג — אישור יאחד…, אם זה קובץ של
// לקוח אחר — ביטול…". Prose explaining what OK does is the symptom; the cure is
// answers that say what they do.
//
// So: the same card as שכפול משכנתא נוכחית (see DuplicateMasterModal and the
// .lgr-ask block in theme.css). One question in the ink. A short receipt of the
// facts the answer acts on — names, counts — because a decision about the wrong
// client's file is made by reading the names, not by reading advice about them.
// Two ordinary buttons, end-aligned, the meaning in the label.

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { X } from "@phosphor-icons/react";
import Btn from "./Btn";

export type AskRow = {
  label: string;
  value: string;
  /** A fact that is present but empty — stated, and stepped back. */
  quiet?: boolean;
};

export default function Ask({
  title,
  sub,
  question,
  rows = [],
  confirm,
  cancel = "ביטול",
  tone = "go",
  onConfirm,
  onClose,
}: {
  title: string;
  /** The file, the lead — whatever names the thing being asked about. */
  sub?: string;
  question: string;
  rows?: AskRow[];
  confirm: string;
  cancel?: string;
  /**
   * "go" — the answer most advisors give is yes: it is the primary, and it
   * holds focus.
   * "danger" — yes destroys something (unsaved work). The safe answer holds
   * focus and the primary weight, and yes is an ordinary button, so a reflex
   * Enter cannot lose anything.
   */
  tone?: "go" | "danger";
  onConfirm: () => void;
  onClose: () => void;
}) {
  const yes = useRef<HTMLButtonElement>(null);
  const no = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    (tone === "danger" ? no : yes).current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, tone]);

  return createPortal(
    <div
      dir="rtl"
      className="lgr-vars fixed inset-0 z-[120] grid place-items-center p-4"
      style={{ background: "rgba(14,21,36,.5)" }}
      onClick={onClose}
      role="presentation"
    >
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="lgr-ask-title"
        initial={{ opacity: 0, y: 10, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="lgr-card lgr-ask"
        style={{ boxShadow: "var(--shadow-lift)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="lgr-head lgr-ask-head">
          <div className="min-w-0">
            <h2 id="lgr-ask-title" className="lgr-title">
              {title}
            </h2>
            {sub && (
              <div className="lgr-sub lgr-ask-sub" title={sub}>
                {sub}
              </div>
            )}
          </div>
          <button className="lgr-act ms-auto" onClick={onClose} aria-label="סגירה">
            <X size={15} weight="bold" />
          </button>
        </header>

        <div className="lgr-ask-body">
          <p className="lgr-ask-q">{question}</p>

          {rows.length > 0 && (
            <dl className="lgr-ask-sheet">
              {rows.map((r) => (
                <div className="lgr-ask-line" key={r.label} data-quiet={r.quiet || undefined}>
                  <dt>{r.label}</dt>
                  <dd className="lgr-ask-v" title={r.value}>
                    {r.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="lgr-ask-acts">
          <Btn
            ref={no}
            className={`lgr-btn lgr-btn-sm ${tone === "danger" ? "lgr-btn-primary" : ""}`}
            onClick={onClose}
          >
            {cancel}
          </Btn>
          <Btn
            ref={yes}
            className={`lgr-btn lgr-btn-sm ${tone === "danger" ? "" : "lgr-btn-primary"}`}
            onClick={onConfirm}
          >
            {confirm}
          </Btn>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
