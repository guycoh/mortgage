"use client";

// איפוס תמהיל — THE KEY AND ITS NAME.
//
// The key is the board's own (a neutral key, a red bin for its mark — see
// .lgr-reset in aa105test/board.css). Its tooltip used to be a CSS ::after on
// the button: one line of 11px text that opened sideways and, at the window's
// inline-end edge, ran off the screen. This one is a real surface, portalled to
// the body so no card's overflow can cut it, placed under the key and clamped
// to the viewport, so it cannot clip at any width. It says what the key is and
// what it does — two short lines, nothing else.
//
// It waits a beat before it opens (passing the cursor across the band stays
// quiet), opens at once for keyboard focus, and leaves the moment the pointer
// does. Presence is Motion; a reduced-motion reader gets the fade alone.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Trash } from "@phosphor-icons/react";
import Btn from "./Btn";
import "./reset.css";

const OPEN_DELAY = 320;
const GAP = 10;
const EDGE = 12;

export default function ResetKey({ onClick }: { onClick: () => void }) {
  const key = useRef<HTMLButtonElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [at, setAt] = useState<DOMRect | null>(null);
  const reduce = useReducedMotion();

  const show = useCallback((delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (key.current) setAt(key.current.getBoundingClientRect());
    }, delay);
  }, []);
  const hide = useCallback(() => {
    window.clearTimeout(timer.current);
    setAt(null);
  }, []);

  // A fixed surface over a page that scrolls would float away from its key.
  useEffect(() => {
    if (!at) return;
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [at, hide]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Under the key, its edge on the key's edge, then pulled inside the window;
  // the pointer stays on the key's centre whatever the clamp did.
  useLayoutEffect(() => {
    const el = tip.current;
    if (!at || !el) return;
    const w = el.offsetWidth;
    const left = Math.min(Math.max(EDGE, at.left), window.innerWidth - w - EDGE);
    el.style.left = `${left}px`;
    el.style.top = `${at.bottom + GAP}px`;
    el.style.setProperty("--rst-arrow", `${at.left + at.width / 2 - left}px`);
  }, [at]);

  return (
    <>
      <Btn
        ref={key}
        className="lgr-btn lgr-btn-sm lgr-reset"
        data-role="act"
        data-tone="red"
        aria-label="איפוס תמהיל — מחיקת הדוח והתחלה מחדש"
        onPointerEnter={() => show(OPEN_DELAY)}
        onPointerLeave={hide}
        onFocus={(e) => e.currentTarget.matches(":focus-visible") && show(0)}
        onBlur={hide}
        onClick={() => {
          hide();
          onClick();
        }}
      >
        <Trash size={14} weight="bold" style={{ color: "var(--neg)" }} />
        איפוס
      </Btn>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {at && (
              <motion.div
                ref={tip}
                dir="rtl"
                role="tooltip"
                className="lgr-vars rst-tip"
                style={{ left: at.left, top: at.bottom + GAP }}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.97 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -2, scale: 0.98, transition: { duration: 0.1 } }}
                transition={reduce ? { duration: 0.12 } : { type: "spring", stiffness: 520, damping: 34 }}
              >
                <span className="rst-tip-mark" aria-hidden>
                  <Trash size={13} weight="fill" />
                </span>
                <span className="rst-tip-text">
                  <span className="rst-tip-title">איפוס תמהיל</span>
                  <span className="rst-tip-sub">מחיקת הדוח והתחלה מחדש</span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
