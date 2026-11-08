"use client";

// איפוס תמהיל — THE ONE QUESTION BEFORE THE REPORT GOES.
//
// The shared Ask card (title, subtitle, a boxed receipt, two buttons) was built
// for decisions that need facts laid out. This one needs none of that: one
// question, in the owner's words, and one line saying what goes with it. The
// receipt box, the middle-dot subtitle and the word "בורד" were noise around a
// yes/no.
//
// The hierarchy is the decision's, not the page's: the destructive answer is
// the red filled button and says what it does (מחיקת הדוח); ביטול is a calm
// key. Focus starts on ביטול, so a reflex Enter cannot delete anything.
//
// Motion: the scrim fades, the card rises and settles on a quick spring, the
// bin's disc arrives a beat later. Leaving is faster than arriving. Reduced
// motion keeps the fades and drops the movement.

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Trash } from "@phosphor-icons/react";
import { snap } from "../lib/transitions";
import "./reset.css";

export default function ResetAsk({
  open,
  names,
  rows,
  onConfirm,
  onClose,
}: {
  open: boolean;
  /** Whose report(s) are on the board — the decision is made by the name. */
  names: string[];
  /** How many rows go with it. */
  rows: number;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  // The press: the key sinks onto its lip (see .rst-btn in reset.css).
  const press = reduce ? undefined : { y: 2 };
  const cancel = useRef<HTMLButtonElement>(null);
  const downOnScrim = useRef(false);
  const confirm = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const back = document.activeElement as HTMLElement | null;
    cancel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      // Two buttons, and focus never leaves them while the question is open.
      if (e.key === "Tab") {
        e.preventDefault();
        (document.activeElement === cancel.current ? confirm : cancel).current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (back?.isConnected) back.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  const who = names.filter(Boolean);
  const subject = who.length > 1 ? "מהדוחות של" : "מהדוח של";

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="rst-scrim"
          dir="rtl"
          className="lgr-vars rst-scrim"
          role="presentation"
          // Only a click that starts AND ends on the scrim closes: a press that
          // began on a button and slid off must not count as "outside".
          onPointerDown={(e) => (downOnScrim.current = e.target === e.currentTarget)}
          onClick={(e) => {
            if (downOnScrim.current && e.target === e.currentTarget) onClose();
            downOnScrim.current = false;
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.16 } }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="rst-q"
            aria-describedby="rst-note"
            className="rst-dialog"
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.96 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0.12 } }
                : { opacity: 0, y: 6, scale: 0.97, transition: { duration: 0.14, ease: [0.4, 0, 1, 1] } }
            }
            transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 420, damping: 32 }}
          >
            <motion.span
              className="rst-mark"
              aria-hidden
              initial={reduce ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 480, damping: 22, delay: 0.06 }}
            >
              <motion.span
                className="grid place-items-center"
                initial={reduce ? false : { rotate: -14 }}
                animate={{ rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.12 }}
              >
                <Trash size={24} weight="duotone" />
              </motion.span>
            </motion.span>

            <h2 id="rst-q" className="rst-q">
              האם אתה בטוח שברצונך למחוק את הדוח?
            </h2>
            <p id="rst-note" className="rst-note">
              {who.length ? (
                <>
                  {rows} השורות שנטענו {subject} <b>{who.join(" ו־")}</b> יימחקו מהתמהיל.
                </>
              ) : (
                <>{rows} השורות שנטענו מהדוח יימחקו מהתמהיל.</>
              )}
            </p>

            <div className="rst-acts">
              <motion.button
                ref={cancel}
                type="button"
                className="rst-btn rst-btn-quiet"
                whileTap={press}
                transition={snap}
                onClick={onClose}
              >
                ביטול
              </motion.button>
              <motion.button
                ref={confirm}
                type="button"
                className="rst-btn rst-btn-danger"
                whileTap={press}
                transition={snap}
                onClick={onConfirm}
              >
                <Trash size={16} weight="bold" />
                מחיקת הדוח
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
