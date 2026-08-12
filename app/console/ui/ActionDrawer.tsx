"use client";

// Everything the panel knows about one act.
//
// The chart says who/when/what at a glance and the table adds the columns;
// this is for the moment you want the whole record of a single import — which
// file, how many pages, how much was read out of it, how long the parse took.

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import type { Action } from "../aggregate";
import { ACTION } from "../lib/tokens";
import { bankLabel, KIND_LABEL, ms, nis, num } from "../lib/labels";
import { stamp, zoned } from "../lib/time";
import { Who } from "./parts";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

export default function ActionDrawer({
  action,
  onClose,
}: {
  action: Action | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!action) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [action, onClose]);

  const skin = action ? ACTION[action.kind] : null;

  return (
    <AnimatePresence>
      {action && skin ? (
        <>
          <motion.div
            className="cns-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.aside
            className="cns-drawer"
            dir="rtl"
            role="dialog"
            aria-label="פרטי פעולה"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 40 }}
          >
            <header className="cns-drawer-head">
              <button className="cns-drawer-close" onClick={onClose} aria-label="סגירה">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  letterSpacing: ".1em",
                  color: "var(--ink-4)",
                }}
              >
                {stamp(action.ts)}
              </div>
              <h2 style={{ fontSize: 19, margin: "2px 0 10px" }}>{action.lead}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <Who name={action.operator} />
                <span
                  className="cns-pill"
                  data-tone={action.kind === "failed" ? "bad" : "mute"}
                  style={{ gap: 6 }}
                >
                  <i
                    aria-hidden
                    style={{
                      background: skin.fill,
                      flex: "none",
                      ...(skin.shape === "dot"
                        ? { width: 8, height: 8, borderRadius: 99 }
                        : skin.shape === "diamond"
                          ? { width: 7, height: 7, borderRadius: 1.5, transform: "rotate(45deg)" }
                          : { width: 3.5, height: 11, borderRadius: 2 }),
                    }}
                  />
                  {skin.label}
                </span>
              </div>
            </header>

            <div className="cns-drawer-body">
              <dl className="cns-def">
                <Row label="שעה" value={<span className="num">{zoned(action.ts).hm}</span>} />
                <Row label="מזהה ליד" value={<span className="num">{action.leadId ?? "—"}</span>} />
                {action.client ? <Row label="שם בדוח" value={action.client} /> : null}
                {action.clientId ? (
                  <Row label="ת.ז" value={<span className="num">{action.clientId}</span>} />
                ) : null}
                {action.docKind ? (
                  <Row label="סוג מסמך" value={KIND_LABEL[action.docKind] ?? action.docKind} />
                ) : null}
                {action.bank ? <Row label="בנק" value={bankLabel(action.bank)} /> : null}
                {action.file ? (
                  <Row
                    label="קובץ"
                    value={
                      <span style={{ wordBreak: "break-all", fontSize: 12 }}>{action.file}</span>
                    }
                  />
                ) : null}
                {action.pages ? (
                  <Row label="עמודים" value={<span className="num">{num(action.pages)}</span>} />
                ) : null}
                {action.rows ? (
                  <Row label="שורות שנקראו" value={<span className="num">{num(action.rows)}</span>} />
                ) : null}
                {action.balance ? (
                  <Row label="יתרה בדוח" value={<span className="num">{nis(action.balance)}</span>} />
                ) : null}
                {action.monthly ? (
                  <Row label="החזר חודשי" value={<span className="num">{nis(action.monthly)}</span>} />
                ) : null}
                {action.parseMs ? (
                  <Row label="זמן פענוח" value={<span className="num">{ms(action.parseMs)}</span>} />
                ) : null}
                {action.error ? (
                  <Row label="שגיאה" value={<span style={{ color: "var(--bad)" }}>{action.error}</span>} />
                ) : null}
              </dl>

              <p style={{ margin: 0, fontSize: 11.5, color: "var(--ink-4)", lineHeight: 1.6 }}>
                תוכן הדוח עצמו לא נשמר — רק המונים שלמעלה, שם הלקוח ומספר הזהות
                שהופיעו בו.
              </p>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
