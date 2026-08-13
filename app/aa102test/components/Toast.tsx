"use client";

// THE TOAST LAYER.
//
// It floats over a dense grid of numbers on a white page, which is the whole
// design problem: a plain white card with a hairline border disappears into the
// table underneath it. So it separates by MATERIAL — a frosted, slightly
// translucent surface with a real border and a tone-tinted ambient shadow. It
// reads as a card lying ON the sheet, not a row of it.
//
// THE ACCENT IS THE CLOCK. A coloured rule down one edge is the most templated
// shape in interface design, and a separate progress bar underneath it is a
// second decoration doing a job the first one could have done. So there is one
// line, along the top, and it RETRACTS as the message's life runs out — tone
// identity and time remaining in a single element. Hovering stops it, which is
// the same gesture that stops the timer, so the two can never disagree.

//
// It also waits. An auto-dismissing message that keeps counting down while you
// are reading it is a message that punishes you for reading it — so hovering (or
// focusing anything inside) holds it, and the drain rail stops with it. The
// remaining time is preserved rather than restarted, so a glance costs nothing
// and a long read costs exactly as long as the read.
//
// Motion doctrine (see lib/transitions): presence belongs to Motion, nothing
// loops, and there are exactly two springs. This uses `settle` — a toast is a
// small surface arriving, not a control being pressed. The drain is CSS, so
// pausing it is one line and it cannot drift from the timer it represents.

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle, Info, WarningCircle, X } from "@phosphor-icons/react";
import { settle } from "../lib/transitions";

export type ToastTone = "pos" | "neutral" | "neg";

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
  /** A second line, for the qualification the headline should not carry. */
  detail?: string;
  /** ms on screen, while not held. The drain rail runs for exactly this long. */
  ttl: number;
}

const ICON: Record<ToastTone, React.ReactNode> = {
  pos: <CheckCircle size={18} weight="fill" />,
  neutral: <Info size={18} weight="fill" />,
  neg: <WarningCircle size={18} weight="fill" />,
};

function Row({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [held, setHeld] = useState(false);
  /** What is left of the life, carried across pauses so a hover never restarts it. */
  const left = useRef(toast.ttl);
  const since = useRef(0);

  useEffect(() => {
    if (held) return;
    since.current = Date.now();
    const t = setTimeout(() => onDismiss(toast.id), Math.max(0, left.current));
    return () => {
      clearTimeout(t);
      // Charge only the time that actually elapsed unheld.
      left.current -= Date.now() - since.current;
    };
  }, [held, toast.id, onDismiss]);

  // Focus counts as holding: reaching the close button with a keyboard must not
  // be a race against the thing you are reaching into.
  const hold = useCallback(() => setHeld(true), []);
  const release = useCallback(() => setHeld(false), []);

  return (
    <motion.li
      layout
      className="lgr-notif"
      data-tone={toast.tone}
      data-held={held || undefined}
      onMouseEnter={hold}
      onMouseLeave={release}
      onFocusCapture={hold}
      onBlurCapture={release}
      // Arrives from below and slightly small, the way a card does elsewhere on
      // this page. `layout` is what makes the stack close up when one leaves,
      // rather than the survivors jumping into the gap.
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      // A spring on the way out would overshoot past the viewport edge and read
      // as a bounce off nothing. Leaving is a tween, and a fast one.
      exit={{ opacity: 0, y: 10, scale: 0.97, transition: { duration: 0.19, ease: [0.62, 0, 0.36, 1] } }}
      transition={settle}
      style={{ ["--ttl" as string]: `${toast.ttl}ms` }}
    >
      <span className="lgr-notif-ico">{ICON[toast.tone]}</span>
      <div className="min-w-0 flex-1">
        <div className="lgr-notif-msg">{toast.message}</div>
        {toast.detail && <div className="lgr-notif-detail">{toast.detail}</div>}
      </div>
      <button
        type="button"
        className="lgr-notif-x"
        onClick={() => onDismiss(toast.id)}
        aria-label="סגירת ההודעה"
      >
        <X size={12} weight="bold" />
      </button>
      {/* The top accent, retracting. One-shot, linear, tied to the real timer —
          the only honest way to say "this is leaving, and here is how soon".
          CSS, so holding it is a single play-state rule and it can never
          disagree with the timeout it represents. */}
      <span className="lgr-notif-edge" aria-hidden />
    </motion.li>
  );
}

export default function Toaster({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    // `lgr-vars` because this portals to document.body, OUTSIDE the scope that
    // defines the design tokens — without it var(--pos), --ink and --card are
    // all undefined here, and the only things that survived were the literal
    // hexes. Every modal on this page carries it for the same reason.
    //
    // aria-live rather than role="alert": these report on something the user
    // just did, and should be read after the action, not interrupt it.
    <ul className="lgr-vars lgr-notifs" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <Row key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </ul>,
    document.body
  );
}
