"use client";

// THE TOAST LAYER.
//
// This page says things quietly — hairline borders, notes at 10px, a highlight
// that decays rather than a banner that stays. A toast has to belong to that,
// which rules out the usual dark pill that slides in from a corner shouting.
//
// So it borrows the board's own device: the 3px coloured spine that runs down
// the start edge of every row to say what KIND of thing it is. A toast is a row
// that arrived from somewhere else. Same spine, same card surface, same
// hairline, and the tone lives entirely in that 3px — the text stays ink.
//
// The drain rail underneath is not decoration. It is the only honest way to say
// "this is leaving, and here is how soon", and without it an auto-dismissing
// message is a thing that vanishes for no reason the reader can see.
//
// Motion doctrine (see lib/transitions): presence belongs to Motion, nothing
// loops, and there are exactly two springs. This uses `settle` — a toast is a
// small surface arriving, not a control being pressed.

import { useEffect } from "react";
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
  /** ms on screen. The drain rail runs for exactly this long. */
  ttl: number;
}

const ICON: Record<ToastTone, React.ReactNode> = {
  pos: <CheckCircle size={16} weight="fill" />,
  neutral: <Info size={16} weight="fill" />,
  neg: <WarningCircle size={16} weight="fill" />,
};

function Row({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), toast.ttl);
    return () => clearTimeout(t);
  }, [toast.id, toast.ttl, onDismiss]);

  return (
    <motion.li
      layout
      className="lgr-toast"
      data-tone={toast.tone}
      // Arrives from below and slightly small, the way a card does elsewhere on
      // this page. `layout` is what makes the stack close up when one leaves,
      // rather than the survivors jumping into the gap.
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      // A spring on the way out would overshoot past the viewport edge and read
      // as a bounce off nothing. Leaving is a tween, and a fast one.
      exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.18, ease: [0.62, 0, 0.36, 1] } }}
      transition={settle}
    >
      <span className="lgr-toast-ico">{ICON[toast.tone]}</span>
      <div className="min-w-0">
        <div className="lgr-toast-msg">{toast.message}</div>
        {toast.detail && <div className="lgr-toast-detail">{toast.detail}</div>}
      </div>
      <button
        type="button"
        className="lgr-toast-x"
        onClick={() => onDismiss(toast.id)}
        aria-label="סגירת ההודעה"
      >
        <X size={12} weight="bold" />
      </button>
      {/* One-shot, linear, tied to a real timer — see the note at the top. */}
      <motion.span
        className="lgr-toast-drain"
        aria-hidden
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: toast.ttl / 1000, ease: "linear" }}
      />
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
    // aria-live rather than role="alert": these report on something the user
    // just did, and should be read after the action, not interrupt it.
    <ul className="lgr-toaster" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <Row key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </ul>,
    document.body
  );
}
