"use client";

// The intake bay. Drop a credit report (חיווי אשראי / דוח ריכוז נתונים) and the
// mix fills itself in: mortgages first, consumer loans under them, each already
// matched to a track and a term.
//
// The visual job here is to look like a slot that accepts a document — a real
// piece of equipment, not a dashed rectangle. The paper glyph tilts toward the
// slot on hover, snaps in on drag, and a scanning beam runs while the PDF is
// decoded. The three-step rail spells out what will happen before you commit.
//
// The file never leaves the tab: the PDF is decoded here, in the browser.

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowClockwise,
  CheckCircle,
  CircleNotch,
  IdentificationCard,
  ShieldCheck,
  UploadSimple,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { parsePdfFile } from "@/lib/credit-parser/extract.client";
import { TRACK_HEX, importReportToLoans, type ImportSummary } from "../lib/credit";

const STEPS = ["גוררים את קובץ ה־PDF", "המסלולים מזוהים אוטומטית", "התמהיל מתמלא"];

export default function Bay({
  mixId,
  onImport,
}: {
  mixId: string;
  onImport: (summary: ImportSummary) => void;
}) {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<ImportSummary | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // dragenter/dragleave fire per child element; count them so the state is stable
  const depth = useRef(0);

  const handle = useCallback(
    async (files: FileList | File[] | null) => {
      const pdf = Array.from(files ?? []).find(
        (f) => /\.pdf$/i.test(f.name) || f.type === "application/pdf"
      );
      if (!pdf) {
        setError("צריך קובץ PDF של דוח ריכוז נתונים.");
        return;
      }
      setBusy(true);
      setError("");
      try {
        const report = await parsePdfFile(pdf);
        const summary = importReportToLoans(report, mixId, pdf.name);
        if (!summary.loans.length) {
          setError(
            summary.skipped.length
              ? `בדוח נמצאו רק ${summary.skipped
                  .map((s) => `${s.label} (${s.count})`)
                  .join(" ו-")} — אלה אינם ניתנים לשילוב בתמהיל.`
              : "לא נמצאו בדוח התחייבויות פעילות עם יתרה."
          );
          return;
        }
        setDone(summary);
        onImport(summary);
      } catch (e) {
        setError((e as Error)?.message || "לא הצלחנו לקרוא את הדוח.");
      } finally {
        setBusy(false);
        depth.current = 0;
        setDrag(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [mixId, onImport]
  );

  /* -------------------------------------------------- imported: the receipt */
  // Once the rows are in the grid, the numbers belong to the grid — repeating
  // them here was just a second, staler copy. All this strip still owes the
  // user is: whose report this is, and a way back out.
  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fin-card overflow-hidden"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3.5 py-2.5">
          <span
            className="grid size-8 flex-none place-items-center rounded-full"
            style={{ background: "var(--pos-tint)", color: "var(--pos)" }}
          >
            <CheckCircle size={18} weight="fill" />
          </span>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="fin-display text-[17px]">{done.clientName || "דוח ללא שם"}</span>
              {done.clientId && (
                <span className="fin-chip !h-[21px] !px-1.5 !text-[10.5px]" style={{ color: "var(--ink-3)" }}>
                  <IdentificationCard size={11} />
                  <span className="fin-fig">{done.clientId}</span>
                </span>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10.5px]" style={{ color: "var(--ink-4)" }}>
              <span className="truncate" style={{ maxWidth: 220 }} title={done.fileName}>
                {done.fileName}
              </span>
              {done.reportDate && <span>· דוח מ־{done.reportDate}</span>}
              {done.guaranteed > 0 && (
                <span title="חובות שהלקוח ערב להם">· {done.guaranteed} בערבות</span>
              )}
            </div>
          </div>

          <button
            className="fin-btn fin-btn-sm ms-auto"
            onClick={() => {
              setDone(null);
              setError("");
            }}
          >
            <ArrowClockwise size={13} weight="bold" />
            ייבוא דוח אחר
          </button>
        </div>
      </motion.div>
    );
  }

  /* ------------------------------------------------------------ idle / busy */
  const headline = busy
    ? "מפענח את הדוח…"
    : error
      ? "לא הצלחנו לקרוא את הדוח"
      : drag
        ? "שחררו כאן"
        : "גררו לכאן חיווי אשראי";

  return (
    <div
      className="fin-bay"
      role="button"
      tabIndex={0}
      data-drag={drag || undefined}
      data-state={error ? "err" : undefined}
      aria-label="גררו לכאן דוח ריכוז נתונים"
      aria-busy={busy}
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current += 1;
        if (!busy) setDrag(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDrag(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setDrag(false);
        if (!busy) handle(e.dataTransfer.files);
      }}
      onClick={() => !busy && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !busy) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />

      {(drag || busy) && <span className="fin-beam" aria-hidden />}

      {/* what comes out of this bay: the five tracks, as a hairline */}
      <div className="fin-bay-accent" aria-hidden>
        {[1, 2, 3, 4, 5].map((id) => (
          <span key={id} style={{ background: TRACK_HEX[id], opacity: drag ? 1 : 0.55 }} />
        ))}
      </div>

      <div className="relative flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-4">
        {/* the paper, half-fed into the slot */}
        <div className="relative flex-none">
          <div className="fin-slot">
            <div className="fin-doc">
              <i />
              <i />
              <i />
            </div>
          </div>
          <AnimatePresence>
            {(busy || (error && !busy)) && (
              <motion.span
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                className="absolute -bottom-1.5 -start-1.5 grid size-7 place-items-center rounded-full border bg-white"
                style={{
                  borderColor: busy ? "var(--line-2)" : "var(--neg-line)",
                  color: busy ? "var(--primary)" : "var(--neg)",
                  boxShadow: "var(--shadow)",
                }}
              >
                {busy ? (
                  <CircleNotch size={14} weight="bold" className="animate-spin" />
                ) : (
                  <WarningCircle size={15} weight="fill" />
                )}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="min-w-[240px] flex-1">
          <div className="fin-display text-[21px]" style={{ color: error ? "var(--neg)" : "var(--ink)" }}>
            {headline}
          </div>
          <div className="mt-2">
            {error ? (
              <p className="text-[11.5px] font-semibold" style={{ color: "var(--neg)" }}>
                {error}
              </p>
            ) : busy ? (
              <p className="text-[11.5px]" style={{ color: "var(--ink-3)" }}>
                מחלצים יתרות, ריביות ומסלולי הצמדה מתוך הדוח…
              </p>
            ) : (
              <div className="fin-steps">
                {STEPS.map((s, i) => (
                  <span key={s} className="contents">
                    {i > 0 && <span className="fin-step-sep" aria-hidden />}
                    <span className="fin-step">
                      <b>{i + 1}</b>
                      {s}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-none items-center gap-3">
          {!busy && !error && (
            <span
              className="hidden items-center gap-1.5 text-[10.5px] leading-tight lg:flex"
              style={{ color: "var(--ink-4)" }}
            >
              <ShieldCheck size={15} />
              הקובץ נשאר
              <br />
              בדפדפן שלכם
            </span>
          )}
          <span className="fin-btn fin-btn-primary !h-9 !px-4" aria-hidden>
            {busy ? (
              <CircleNotch size={14} weight="bold" className="animate-spin" />
            ) : error ? (
              <ArrowClockwise size={14} weight="bold" />
            ) : (
              <UploadSimple size={14} weight="bold" />
            )}
            {busy ? "מפענח…" : error ? "נסו שוב" : "בחירת קובץ"}
          </span>
          {error && (
            <button
              className="fin-act"
              aria-label="סגירת ההודעה"
              onClick={(e) => {
                e.stopPropagation();
                setError("");
              }}
            >
              <X size={13} weight="bold" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
