"use client";

// The full-screen surface the /aa105test views are presented on.
//
// It takes over the window rather than floating a card over the board: this is
// the screen an advisor turns toward the client, so nothing of the workbench is
// left behind it. A bar carries who it is about, where in the page you are
// (tabs follow the scroll), and the few things you do from here; Esc closes.
// Fullscreen is one click away for a laptop turned across a desk.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { ArrowsIn, ArrowsOut, Printer, X } from "@phosphor-icons/react";
import Logo from "@/app/aa102test/components/Logo";
import "../brief.css";

/** Scroll the stage to a section — for a finding that points at its evidence. */
const GoTo = createContext<(id: string) => void>(() => {});
export const useStageGo = () => useContext(GoTo);

export interface StageTab {
  id: string;
  label: string;
  /** A count beside the label in the rail — findings, rows. */
  count?: number;
  tone?: "critical" | "high" | "medium";
}

/** Which section the reader is in — the last one whose top has passed a line near the top. */
function useSpy(root: React.RefObject<HTMLDivElement | null>, list: string[]) {
  const [on, setOn] = useState(list[0] ?? "");
  const key = list.join("|");
  useEffect(() => {
    const ids = key ? key.split("|") : [];
    const el = root.current;
    if (!el || !ids.length) return;
    const read = () => {
      const top = el.getBoundingClientRect().top + 120;
      let cur = ids[0];
      for (const id of ids) {
        const s = el.querySelector<HTMLElement>(`#${id}`);
        if (s && s.getBoundingClientRect().top <= top) cur = id;
      }
      // At the very bottom the last section wins even if it is short.
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) cur = ids[ids.length - 1];
      setOn(cur);
    };
    read();
    el.addEventListener("scroll", read, { passive: true });
    return () => el.removeEventListener("scroll", read);
  }, [root, key]);
  return [on, setOn] as const;
}

export default function Stage({
  label,
  who,
  tabs = [],
  actions,
  children,
  onClose,
  holdEscape,
  overlay,
  nav = "bar",
}: {
  /** Accessible name of the dialog. */
  label: string;
  /** The client and the document date, beside the mark. */
  who?: ReactNode;
  tabs?: StageTab[];
  /** Buttons before print/fullscreen/close. */
  actions?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  /** Something on top (a dialog) owns Esc right now. */
  holdEscape?: boolean;
  /** Rendered inside the stage so it survives fullscreen. */
  overlay?: ReactNode;
  /** "bar" — tabs in the top bar (a few chapters); "rail" — a side index (many sections). */
  nav?: "bar" | "rail";
}) {
  const host = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [full, setFull] = useState(false);
  const ids = tabs.map((t) => t.id);
  const [current, setCurrent] = useSpy(scroller, ids);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !holdEscape && !document.fullscreenElement) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    scroller.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, holdEscape]);

  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === host.current);
    document.addEventListener("fullscreenchange", on);
    return () => {
      document.removeEventListener("fullscreenchange", on);
      if (document.fullscreenElement === host.current) void document.exitFullscreen().catch(() => {});
    };
  }, []);

  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void host.current?.requestFullscreen?.().catch(() => {});
  }, []);

  const go = useCallback(
    (id: string) => {
      const el = scroller.current;
      const s = el?.querySelector<HTMLElement>(`#${id}`);
      if (!el || !s) return;
      if (ids.includes(id)) setCurrent(id);
      const top = el.scrollTop + s.getBoundingClientRect().top - el.getBoundingClientRect().top - 12;
      el.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reduce, ids.join("|"), setCurrent]
  );

  return createPortal(
    <motion.div
      ref={host}
      dir="rtl"
      className="brf-root brf-stage lgr-printable"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduce ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <header className="brf-bar">
        <div className="brf-bar-id">
          <span className="brf-mark brf-mark-sm">
            <Logo size={24} />
            <span>מורגי</span>
          </span>
          {who && <span className="brf-bar-who">{who}</span>}
        </div>
        {nav === "bar" && tabs.length > 1 ? (
          <nav className="brf-tabs" aria-label="ניווט בעמוד">
            {tabs.map((t) => (
              <button key={t.id} className="brf-tab" aria-current={current === t.id || undefined} onClick={() => go(t.id)}>
                {current === t.id && (
                  <motion.span layoutId="brf-tab-pill" className="brf-tab-pill" transition={{ type: "spring", stiffness: 520, damping: 42 }} />
                )}
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
        ) : (
          <span />
        )}
        <div className="brf-acts">
          {actions}
          <button className="brf-ico" onClick={() => window.print()} aria-label="הדפסה" title="הדפסה">
            <Printer size={17} />
          </button>
          <button className="brf-ico" onClick={toggleFull} aria-label={full ? "יציאה ממסך מלא" : "מסך מלא"} title={full ? "יציאה ממסך מלא" : "מסך מלא"}>
            {full ? <ArrowsIn size={17} /> : <ArrowsOut size={17} />}
          </button>
          <button className="brf-ico" onClick={onClose} aria-label="סגירה" title="סגירה">
            <X size={17} weight="bold" />
          </button>
        </div>
      </header>
      <motion.div
        ref={scroller}
        className="brf-scroll"
        tabIndex={-1}
        initial={{ y: reduce ? 0 : 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: reduce ? 0 : 0.5, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : 0.05 }}
      >
        <GoTo.Provider value={go}>
        {nav === "rail" && tabs.length > 1 ? (
          <div className="brf-dd">
            <nav className="brf-rail" aria-label="ניווט בניתוח">
              {tabs.map((t) => (
                <button key={t.id} className="brf-rail-item" aria-current={current === t.id || undefined} onClick={() => go(t.id)}>
                  {current === t.id && (
                    <motion.span layoutId="brf-rail-pill" className="brf-rail-pill" transition={{ type: "spring", stiffness: 520, damping: 42 }} />
                  )}
                  <span className="brf-rail-text">{t.label}</span>
                  {t.count !== undefined && <span className="brf-rail-n" data-tone={t.tone}>{t.count}</span>}
                </button>
              ))}
            </nav>
            <div className="brf-dd-main">{children}</div>
          </div>
        ) : (
          children
        )}
        </GoTo.Provider>
      </motion.div>
      {overlay}
    </motion.div>,
    document.body
  );
}
