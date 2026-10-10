"use client";

// שליחה ללקוח — freeze the brief into a page the client opens with a code.
//
// The same two steps as the offer link (ShareOfferDialog): who the page greets
// and who to call, then the link and its 6-digit code, each one tap to copy,
// with a ready WhatsApp message. The code is shown once; the server keeps a hash.
// Rendered inside the Stage, not portalled, so it survives fullscreen.

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowSquareOut, Check, Copy, WhatsappLogo, X } from "@phosphor-icons/react";
import { freezeBrief, type BriefDoc } from "../lib/brief";

/** Shared with the offer dialog — the advisor types their details once. */
const ADVISOR_KEY = "aa102.advisor";

type Result = { url: string; code: string };

function CopyField({ label, value, big }: { label: string; value: string; big?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <div className="brf-dlg-field" data-big={big || undefined}>
      <span className="brf-dlg-label">{label}</span>
      <div className="brf-dlg-copyrow">
        <span className="brf-dlg-value" dir="ltr">
          {value}
        </span>
        <button
          type="button"
          className="brf-dlg-copy"
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

export default function ShareBriefDialog({
  doc,
  leadId,
  onClose,
}: {
  doc: BriefDoc;
  leadId?: number | null;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const first = useRef<HTMLInputElement>(null);
  const [client, setClient] = useState(doc.who);
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
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const create = async () => {
    setBusy(true);
    setErr(null);
    try {
      localStorage.setItem(ADVISOR_KEY, JSON.stringify({ name, phone }));
    } catch {}
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: freezeBrief(doc, client, { name, phone }), ...(leadId ? { leadId } : {}) }),
      });
      const j = (await res.json().catch(() => ({}))) as Partial<Result> & { error?: string };
      if (!res.ok || !j.url || !j.code) throw new Error(j.error || "יצירת הקישור נכשלה");
      setResult({ url: j.url, code: j.code });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "יצירת הקישור נכשלה");
    } finally {
      setBusy(false);
    }
  };

  const message = result
    ? `${client ? `שלום ${client},\n` : ""}כאן תמצאו את סיכום החובות שלכם ואת הנושאים שחשוב לבדוק:\n${result.url}\nקוד הכניסה: ${result.code}`
    : "";

  return (
    <div className="brf-dlg-back" onClick={onClose} role="presentation">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="brf-dlg-title"
        className="brf-dlg"
        initial={{ opacity: 0, y: reduce ? 0 : 12, scale: reduce ? 1 : 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduce ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="brf-dlg-head">
          <h2 id="brf-dlg-title">שליחה ללקוח</h2>
          <button className="brf-ico" onClick={onClose} aria-label="סגירה">
            <X size={16} weight="bold" />
          </button>
        </header>

        <AnimatePresence mode="wait" initial={false}>
          {!result ? (
            <motion.div
              key="form"
              className="brf-dlg-body"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }}
            >
              <label className="brf-dlg-input">
                <span>שם הלקוח לתצוגה</span>
                <input ref={first} value={client} onChange={(e) => setClient(e.target.value)} placeholder="למשל: משפחת כהן" />
              </label>
              <div className="brf-dlg-two">
                <label className="brf-dlg-input">
                  <span>שם היועץ</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label className="brf-dlg-input">
                  <span>טלפון היועץ</span>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" inputMode="tel" />
                </label>
              </div>
              <p className="brf-dlg-note">הלקוח יראה את הגרסה הנוכחית של הסיכום. הקישור בתוקף ל-14 יום.</p>
              {err && <p className="brf-dlg-err">{err}</p>}
            </motion.div>
          ) : (
            <motion.div
              key="done"
              className="brf-dlg-body"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22 }}
            >
              <CopyField label="קישור" value={result.url} />
              <CopyField label="קוד כניסה" value={result.code} big />
              <div className="brf-dlg-links">
                <a className="brf-btn brf-btn-wa" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
                  <WhatsappLogo size={18} weight="fill" />
                  שליחה בוואטסאפ
                </a>
                <a className="brf-btn" href={result.url} target="_blank" rel="noopener noreferrer">
                  <ArrowSquareOut size={17} />
                  פתיחת העמוד
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="brf-dlg-acts">
          {!result ? (
            <>
              <button className="brf-dlg-btn" onClick={onClose}>
                ביטול
              </button>
              <button className="brf-dlg-btn" data-primary disabled={busy} onClick={create}>
                {busy ? "יצירת הקישור…" : "יצירת קישור ללקוח"}
              </button>
            </>
          ) : (
            <button className="brf-dlg-btn" data-primary onClick={onClose}>
              סיום
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
