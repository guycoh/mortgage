"use client";

// Credit-report import for /aa4, multi-report edition: load one report or add
// the spouse's as well. Parsing stays fully in-browser (parsePdfFile →
// extractLoans); the page cross-matches the reports into the liabilities board.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  UploadSimple,
  CircleNotch,
  ArrowsClockwise,
  FileMagnifyingGlass,
  BracketsCurly,
  WarningCircle,
  X,
  Plus,
  File as FileIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  parsePdfFile,
  extractLoans,
  ReportSheet,
  ReportJsonPanel,
  PERSON_COLORS,
  type ReportSlot,
  type CreditReport,
} from "@/components/credit-import";

const ease = [0.22, 1, 0.36, 1] as const;

let slotSeq = 0;
const sid = () => `rep_${++slotSeq}`;

interface Props {
  onReports: (slots: ReportSlot[]) => void;
  onImported: () => void;
  /** Sits in the loaded-reports header — the page supplies the Excel export. */
  headerAction?: React.ReactNode;
}

export default function ImportBar({ onReports, onImported, headerAction }: Props) {
  const reduce = useReducedMotion();
  const [slots, setSlots] = useState<ReportSlot[]>([]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<{ id: string; kind: "sheet" | "json" } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  const commit = useCallback(
    (next: ReportSlot[], grew: boolean) => {
      setSlots(next);
      onReports(next);
      if (grew) onImported();
    },
    [onReports, onImported]
  );

  /** Insert a parsed report; a re-upload of the same person replaces their slot. */
  const addReport = useCallback(
    (report: CreditReport, fileName: string) => {
      const slot: ReportSlot = { id: sid(), fileName, report, loans: extractLoans(report) };
      const next = [...slotsRef.current];
      const dup = next.findIndex(
        (s) => s.report.client.idNumber && s.report.client.idNumber === report.client.idNumber
      );
      if (dup >= 0) next[dup] = slot;
      else next.push(slot);
      commit(next, dup < 0);
    },
    [commit]
  );

  const handleFiles = useCallback(
    async (files: FileList | File[] | null | undefined) => {
      const pdfs = Array.from(files ?? []).filter(
        (f) => /pdf$/i.test(f.name) || f.type === "application/pdf"
      );
      if (!pdfs.length) {
        setError("קובץ לא נתמך. יש להעלות דוח PDF.");
        return;
      }
      setBusy(true);
      setError("");
      for (const f of pdfs) {
        try {
          const report = await parsePdfFile(f);
          addReport(report, f.name);
        } catch (e) {
          setError((e as Error).message || `לא ניתן לקרוא את ${f.name}.`);
        }
      }
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    },
    [addReport]
  );

  const removeSlot = (id: string) => {
    commit(slotsRef.current.filter((s) => s.id !== id), false);
    setView((v) => (v?.id === id ? null : v));
  };

  const resetAll = () => {
    commit([], false);
    setView(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  // Dev-only hook: lets a test inject an already-parsed report (no PDF needed).
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const w = window as unknown as Record<string, unknown>;
    w.__aa4AddReport = (report: CreditReport, fileName = "dev.json") => addReport(report, fileName);
    w.__aa4GetReports = () => slotsRef.current;
    return () => {
      delete w.__aa4AddReport;
      delete w.__aa4GetReports;
    };
  }, [addReport]);

  const dropProps = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      if (!busy) setDrag(true);
    },
    onDragLeave: () => setDrag(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      if (!busy) handleFiles(e.dataTransfer.files);
    },
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      multiple
      accept="application/pdf,.pdf"
      className="hidden"
      onChange={(e) => handleFiles(e.target.files)}
    />
  );

  /* ------------------------------------------------------ reports loaded --- */
  if (slots.length > 0) {
    const active = view ? slots.find((s) => s.id === view.id) : undefined;
    return (
      <>
        <ReportSheet
          report={active?.report ?? null}
          fileName={active?.fileName ?? ""}
          open={view?.kind === "sheet" && !!active}
          onClose={() => setView(null)}
        />
        <ReportJsonPanel
          report={active?.report ?? null}
          open={view?.kind === "json" && !!active}
          onClose={() => setView(null)}
          side="left"
        />

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease }}
          className="aa4-card overflow-hidden"
          data-drag={drag}
          {...dropProps}
        >
          {fileInput}
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: "var(--line)" }}>
            <span className="flex items-center gap-2 text-[13px] font-bold text-[var(--ink)]">
              דוחות ריכוז נתונים
              <span className="aa4-fig rounded-[var(--r-pill)] px-2 py-0.5 text-[10.5px] font-semibold" style={{ background: "var(--brand-tint)", color: "var(--brand-deep)" }}>
                {slots.length}
              </span>
            </span>
            <div className="flex shrink-0 items-center gap-2">
              {headerAction}
              <button onClick={resetAll} className="aa4-btn aa4-btn-ghost !px-2.5 !py-1.5 !text-[12px]">
                <ArrowsClockwise className="size-3.5" />
                התחלה מחדש
              </button>
            </div>
          </div>

          <ul>
            <AnimatePresence initial={false}>
              {slots.map((s, i) => (
                <motion.li
                  key={s.id}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, height: 0 }}
                  transition={{ duration: 0.28, ease }}
                  className="flex items-center gap-3 border-b px-4 py-3"
                  style={{ borderColor: "var(--line)" }}
                >
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-full text-[15px] font-bold text-white"
                    style={{ background: PERSON_COLORS[i % PERSON_COLORS.length] }}
                  >
                    {(s.report.client.name || "?").charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-bold text-[var(--ink)]">
                        {s.report.client.name || "לקוח"}
                      </span>
                      {s.report.client.idNumber && (
                        <span className="aa4-fig shrink-0 text-[11px] text-[var(--ink-3)]" dir="ltr">
                          ת.ז {s.report.client.idNumber}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-[var(--ink-3)]">
                      <FileIcon className="size-3.5 shrink-0" />
                      <span className="truncate">{s.fileName}</span>
                      {s.report.meta.reportDate && (
                        <>
                          <span className="opacity-40">·</span>
                          <span className="aa4-fig shrink-0">{s.report.meta.reportDate}</span>
                        </>
                      )}
                      <span className="opacity-40">·</span>
                      <span className="aa4-fig shrink-0">{s.loans.length} עסקות פתוחות</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => setView({ id: s.id, kind: "sheet" })}
                      className="aa4-btn aa4-btn-ghost !px-2.5 !py-1.5 !text-[12px]"
                    >
                      <FileMagnifyingGlass className="size-4" />
                      דוח מלא
                    </button>
                    <button
                      onClick={() => setView({ id: s.id, kind: "json" })}
                      className="aa4-iconbtn !text-[var(--ink-3)] hover:!bg-[var(--brand-tint)] hover:!text-[var(--brand-deep)]"
                      aria-label={`נתוני הדוח של ${s.report.client.name}`}
                    >
                      <BracketsCurly className="size-4" />
                    </button>
                    <button onClick={() => removeSlot(s.id)} className="aa4-iconbtn" aria-label={`הסרת הדוח של ${s.report.client.name}`}>
                      <X className="size-4" />
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>

            {busy && (
              <li className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: "var(--line)" }}>
                <span className="grid size-10 shrink-0 place-items-center rounded-full" style={{ background: "var(--surface-3)" }}>
                  <CircleNotch className="size-5 animate-spin text-[var(--brand)]" />
                </span>
                <span className="text-[12.5px] text-[var(--ink-2)]">מנתח את הדוח...</span>
              </li>
            )}
          </ul>

          {error && (
            <div className="flex items-center gap-2 px-4 pt-2.5 text-[12px] font-semibold text-[var(--neg)]">
              <WarningCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={() => !busy && inputRef.current?.click()}
            className="group m-3 flex w-[calc(100%-1.5rem)] items-center justify-center gap-2 rounded-[var(--r-control)] border border-dashed px-4 py-2.5 text-[12.5px] font-semibold text-[var(--ink-3)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand-deep)]"
            style={{ borderColor: drag ? "var(--brand)" : "var(--line-2)", background: drag ? "var(--brand-tint)" : "transparent" }}
          >
            <Plus className="size-4" />
            הוספת דוח של בן/בת הזוג — עסקות משותפות יזוהו ויאוחדו
          </button>
        </motion.div>
      </>
    );
  }

  /* ------------------------------------------------ idle / loading / error - */
  const isError = !!error;
  return (
    <div
      {...dropProps}
      onClick={() => !busy && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !busy) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      role="button"
      tabIndex={busy ? -1 : 0}
      aria-label="העלאת דוח ריכוז נתונים בפורמט PDF, אפשר גם שני דוחות"
      data-drag={drag}
      className={cn("aa4-drop flex cursor-pointer items-center gap-4 px-5 py-4", busy && "pointer-events-none")}
      style={isError ? { borderColor: "var(--neg)", borderStyle: "solid" } : undefined}
    >
      {fileInput}

      <span
        className="grid size-12 shrink-0 place-items-center rounded-[var(--r-control)] text-white"
        style={{ background: isError ? "var(--neg)" : "linear-gradient(160deg, var(--brand-bright), var(--brand-deep))" }}
      >
        {busy ? <CircleNotch className="size-6 animate-spin" /> : isError ? <WarningCircle className="size-6" /> : <UploadSimple className="size-6" />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold text-[var(--ink)]">
          {busy ? "מנתח את הדוח" : isError ? "לא הצלחנו לקרוא את הדוח" : "גררו לכאן דוח ריכוז נתונים"}
        </div>
        <div className="mt-0.5 truncate text-[12.5px] text-[var(--ink-3)]">
          {busy
            ? "מחלץ הלוואות, משכנתאות ומסלולי ריבית. רגע אחד."
            : isError
              ? error
              : "PDF ממערכת נתוני אשראי. אפשר גם שני דוחות, שלכם ושל בן/בת הזוג"}
        </div>
      </div>

      {!busy && (
        <span className={cn("aa4-btn shrink-0", isError ? "aa4-btn-ghost" : "aa4-btn-primary")}>
          {isError ? (
            <>
              <X className="size-4" /> נסו שוב
            </>
          ) : (
            "בחירת קבצים"
          )}
        </span>
      )}
    </div>
  );
}
