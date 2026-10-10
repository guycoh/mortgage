"use client";

// הצגה ללקוח — freeze the comparison into a page the client can open.
//
// Two steps in one card. First the three facts the page needs from a person —
// the client's name as it should greet them, and the advisor's name and phone
// for the contact line (remembered in this browser). Then the result: the link
// and its 6-digit code, each one tap to copy, plus a ready message for
// WhatsApp. The code is shown once; the server keeps only its hash.

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowSquareOut, Check, Copy, WhatsappLogo, X } from "@phosphor-icons/react";
import Btn from "./Btn";
import Money from "./Money";
import type { ImportedLoan } from "../lib/credit";
import type { Assume } from "../lib/price";
import { buildOffer } from "../lib/offer";

const ADVISOR_KEY = "aa102.advisor";

type Result = { url: string; code: string; expiresAt: string };

function CopyField({ label, value, big }: { label: string; value: string; big?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <div className="lgr-sendo-field" data-big={big || undefined}>
      <span className="lgr-sendo-label">{label}</span>
      <div className="lgr-sendo-row">
        <span className="lgr-sendo-value" dir="ltr">
          {value}
        </span>
        <button
          type="button"
          className="lgr-sendo-copy"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setDone(true);
              setTimeout(() => setDone(false), 1400);
            } catch {}
          }}
          aria-label={`העתקת ${label}`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={done ? "y" : "n"}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.14 }}
              style={{ display: "inline-flex" }}
            >
              {done ? <Check size={15} weight="bold" /> : <Copy size={15} />}
            </motion.span>
          </AnimatePresence>
          {done ? "הועתק" : "העתקה"}
        </button>
      </div>
    </div>
  );
}

export default function ShareOfferDialog({
  current,
  proposed,
  assume,
  defaultClient,
  leadId,
  onClose,
}: {
  current: ImportedLoan[];
  proposed: ImportedLoan[];
  assume: Assume;
  defaultClient: string;
  leadId?: number | null;
  onClose: () => void;
}) {
  const [client, setClient] = useState(defaultClient);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    try {
      const a = JSON.parse(localStorage.getItem(ADVISOR_KEY) || "{}") as { name?: string; phone?: string };
      if (a.name) setName(a.name);
      if (a.phone) setPhone(a.phone);
    } catch {}
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const preview = useMemo(() => buildOffer(current, proposed, assume, { client, advisor: { name, phone } }), [current, proposed, assume, client, name, phone]);
  const saving = preview ? preview.current.cost - preview.proposed.cost : 0;

  const create = async () => {
    if (!preview) return;
    setBusy(true);
    setErr(null);
    try {
      localStorage.setItem(ADVISOR_KEY, JSON.stringify({ name, phone }));
    } catch {}
    try {
      const res = await fetch("/api/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: preview, ...(leadId ? { leadId } : {}) }),
      });
      const j = (await res.json().catch(() => ({}))) as Partial<Result> & { error?: string };
      if (!res.ok || !j.url || !j.code) throw new Error(j.error || "יצירת הקישור נכשלה");
      setResult({ url: j.url, code: j.code, expiresAt: j.expiresAt ?? "" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "יצירת הקישור נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const message = result
    ? `${client ? `שלום ${client},\n` : ""}הכנו עבורכם הצעה למחזור המשכנתא. תוכלו לראות את ההשוואה כאן:\n${result.url}\nקוד הכניסה: ${result.code}`
    : "";

  return createPortal(
    <div
      dir="rtl"
      className="lgr-vars fixed inset-0 z-[120] grid place-items-center p-4"
      style={{ background: "rgba(14,21,36,.5)" }}
      onClick={onClose}
      role="presentation"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lgr-share-title"
        initial={{ opacity: 0, y: 10, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="lgr-card lgr-ask lgr-sendo"
        style={{ boxShadow: "var(--shadow-lift)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="lgr-head lgr-ask-head">
          <div className="min-w-0">
            <h2 id="lgr-share-title" className="lgr-title">
              שיתוף עם הלקוח
            </h2>
            {preview && saving > 0 && (
              <div className="lgr-sub lgr-ask-sub">
                חיסכון צפוי של <Money value={saving} block={false} weight={700} /> בריבית ובהצמדה
              </div>
            )}
          </div>
          <button className="lgr-act ms-auto" onClick={onClose} aria-label="סגירה">
            <X size={15} weight="bold" />
          </button>
        </header>

        <AnimatePresence mode="wait" initial={false}>
          {!result ? (
            <motion.div
              key="form"
              className="lgr-ask-body lgr-sendo-body"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }}
            >
              <label className="lgr-sendo-input">
                <span>שם הלקוח כפי שיופיע בעמוד</span>
                <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="למשל: משפחת כהן" />
              </label>
              <div className="lgr-sendo-two">
                <label className="lgr-sendo-input">
                  <span>שם היועץ</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label className="lgr-sendo-input">
                  <span>טלפון היועץ</span>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" inputMode="tel" />
                </label>
              </div>
              <p className="lgr-sendo-note">הלקוח יראה את הנתונים הנוכחיים. לשיתוף תמהיל מעודכן יש ליצור קישור חדש. הקישור בתוקף 14 יום.</p>
              {err && <p className="lgr-fc-err">{err}</p>}
            </motion.div>
          ) : (
            <motion.div
              key="done"
              className="lgr-ask-body lgr-sendo-body"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22 }}
            >
              <CopyField label="קישור" value={result.url} />
              <CopyField label="קוד כניסה" value={result.code} big />
              <div className="lgr-sendo-acts">
                <a
                  className="lgr-btn lgr-btn-sm lgr-sendo-wa"
                  href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WhatsappLogo size={16} weight="fill" />
                  שליחה בוואטסאפ
                </a>
                <a className="lgr-btn lgr-btn-sm" href={result.url} target="_blank" rel="noopener noreferrer">
                  <ArrowSquareOut size={15} />
                  פתיחת העמוד
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="lgr-ask-acts">
          {!result ? (
            <>
              <Btn className="lgr-btn lgr-btn-sm" onClick={onClose}>
                ביטול
              </Btn>
              <Btn className="lgr-btn lgr-btn-sm lgr-btn-primary" disabled={busy || !preview} onClick={create}>
                {busy ? "יצירת הקישור…" : "יצירת קישור ללקוח"}
              </Btn>
            </>
          ) : (
            <Btn className="lgr-btn lgr-btn-sm lgr-btn-primary" onClick={onClose}>
              סיום
            </Btn>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
