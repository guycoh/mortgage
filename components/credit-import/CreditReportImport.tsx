"use client";

// Universal, reusable credit-report import control.
//
// Drop-in for ANY calculator on the site: it drag-drops + parses an Israeli
// "דוח ריכוז נתונים" (Credit Data System report) entirely in the browser, lets
// the user pick which debts to use, and hands the selected loans back through
// `onSelect` — the host maps them to whatever shape its calculator needs. It
// also exposes the full parsed report and an organized JSON side panel.
//
// Example (loan-consolidation calculator):
//   <CreditReportImport
//     onSelect={(loans) => setRows(loans.map(toLoanRows))}
//     onImported={highlightCalculator}
//   />
//
// Example (a "total exposure" widget — take everything, no list, no JSON):
//   <CreditReportImport
//     candidateFilter={() => true}
//     showCandidates={false}
//     showJsonPanel={false}
//     onSelect={(loans) => setTotal(loans.reduce((s, l) => s + l.balance, 0))}
//   />

import { useCallback, useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle2,
  X,
  AlertTriangle,
  Landmark,
  RotateCcw,
  FileJson,
  ScrollText,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parsePdfFile } from "@/lib/credit-parser/extract.client";
import { extractLoans, type ExtractedLoan } from "@/lib/credit-parser/loan-mapping";
import type { CreditReport } from "@/lib/credit-parser/types";
import ReportJsonPanel from "./ReportJsonPanel";
import ReportSheet from "./report-view/ReportSheet";

type Status = "idle" | "loading" | "done" | "error";

export interface CreditReportImportProps {
  /** Fires with the currently-selected loans (on parse and on every toggle). */
  onSelect?: (loans: ExtractedLoan[], report: CreditReport) => void;
  /** Fires once after each parse with EVERY extracted debt (empty on reset). */
  onExtract?: (all: ExtractedLoan[], report: CreditReport | null) => void;
  /** Fires once after each successful parse, with the full report. */
  onImported?: (report: CreditReport) => void;
  /** Which extracted debts appear in the list. Default: all active debts. */
  candidateFilter?: (loan: ExtractedLoan) => boolean;
  /** Which listed debts are selectable / pulled into the calculator. Default: loans & mortgages. */
  isInjectable?: (loan: ExtractedLoan) => boolean;
  /** Which injectable debts are pre-checked. Default: the client's own active loans & mortgages. */
  isDefaultSelected?: (loan: ExtractedLoan) => boolean;
  /** Show the collapsible full-report JSON side panel. Default true. */
  showJsonPanel?: boolean;
  /** Auto-open the JSON panel after a successful parse. Default true. */
  autoOpenJson?: boolean;
  /** Offer the full searchable report view (opens in a full-screen sheet). Default true. */
  showReportView?: boolean;
  /** Show the checkbox candidate list. Default true. */
  showCandidates?: boolean;
  /** Side the JSON panel slides in from. Default "left". */
  jsonSide?: "left" | "right";
  /** Dropzone headline / subtitle overrides. */
  title?: string;
  hint?: string;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

const shekel = (n: number) => `${Math.round(n).toLocaleString("en-US")} ₪`;
const showAll = () => true;
const defaultInjectable = (l: ExtractedLoan) => l.isLoanOrMortgage;
const defaultSelected = (l: ExtractedLoan) => l.defaultInclude;

export default function CreditReportImport({
  onSelect,
  onExtract,
  onImported,
  candidateFilter = showAll,
  isInjectable = defaultInjectable,
  isDefaultSelected = defaultSelected,
  showJsonPanel = true,
  autoOpenJson = true,
  showReportView = true,
  showCandidates = true,
  jsonSide = "left",
  title,
  hint,
  className,
}: CreditReportImportProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [loans, setLoans] = useState<ExtractedLoan[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [report, setReport] = useState<CreditReport | null>(null);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const emit = useCallback(
    (all: ExtractedLoan[], sel: Set<string>, rep: CreditReport) => {
      onSelect?.(all.filter((l) => sel.has(l.uid)), rep);
    },
    [onSelect]
  );

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      if (!/pdf$/i.test(file.name) && file.type !== "application/pdf") {
        setStatus("error");
        setError("קובץ לא נתמך — יש להעלות דוח PDF.");
        return;
      }
      setStatus("loading");
      setError("");
      setFileName(file.name);
      try {
        const parsed = await parsePdfFile(file);
        const all = extractLoans(parsed);
        const sel = new Set(
          all.filter((l) => isInjectable(l) && isDefaultSelected(l)).map((l) => l.uid)
        );
        setReport(parsed);
        setLoans(all);
        setSelected(sel);
        setStatus("done");
        emit(all, sel, parsed);
        onExtract?.(all, parsed);
        onImported?.(parsed);
        if (showJsonPanel && autoOpenJson) setJsonOpen(true);
      } catch (e) {
        setStatus("error");
        setError((e as Error).message || "לא ניתן לקרוא את הקובץ.");
      }
    },
    [isInjectable, isDefaultSelected, emit, onExtract, onImported, showJsonPanel, autoOpenJson]
  );

  const toggle = (uid: string) => {
    if (!report) return;
    const loan = loans.find((l) => l.uid === uid);
    if (!loan || !isInjectable(loan)) return; // only loans/mortgages are selectable
    const next = new Set(selected);
    if (next.has(uid)) next.delete(uid);
    else next.add(uid);
    setSelected(next);
    emit(loans, next, report);
  };

  const reset = () => {
    setStatus("idle");
    setError("");
    setFileName("");
    setLoans([]);
    setSelected(new Set());
    setReport(null);
    setJsonOpen(false);
    setReportOpen(false);
    onSelect?.([], report as CreditReport);
    onExtract?.([], null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const candidates = loans.filter(candidateFilter);
  const injectables = candidates.filter(isInjectable);
  const others = candidates.filter((l) => !isInjectable(l));
  const chosen = injectables.filter((l) => selected.has(l.uid));
  const totalBalance = chosen.reduce((s, l) => s + l.balance, 0);
  const othersTotal = others.reduce((s, l) => s + l.balance, 0);

  const renderDebtRow = (l: ExtractedLoan, injectable: boolean) => {
    const on = injectable && selected.has(l.uid);
    return (
      <li
        key={l.uid}
        onClick={injectable ? () => toggle(l.uid) : undefined}
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-[11px] transition",
          injectable
            ? on
              ? "cursor-pointer bg-white hover:bg-slate-50/70"
              : "cursor-pointer bg-slate-50/40 opacity-60 hover:opacity-90"
            : "bg-white"
        )}
      >
        {injectable ? (
          <span
            className={cn(
              "grid size-4 shrink-0 place-items-center rounded border transition",
              on ? "border-[#1d75a1] bg-[#1d75a1] text-white" : "border-slate-300 bg-white"
            )}
          >
            {on && <CheckCircle2 className="size-3.5" />}
          </span>
        ) : (
          <span className="size-1.5 shrink-0 rounded-full bg-slate-300" />
        )}
        {l.isMortgage && <Landmark className="size-3.5 shrink-0 text-[#1d75a1]" />}
        <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{l.source}</span>
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold",
            l.role === "debtor" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
          )}
        >
          {l.role === "debtor" ? "חייב" : "ערב"}
        </span>
        <span className="hidden shrink-0 text-slate-400 sm:inline">{l.type}</span>
        <span className="w-[70px] shrink-0 text-left font-bold text-slate-800">{shekel(l.balance)}</span>
        <span className="w-[42px] shrink-0 text-center text-slate-500">
          {l.interest ? `${l.interest}%` : "—"}
        </span>
        <span className="w-[46px] shrink-0 text-center text-slate-500">
          {l.months ? `${l.months} ח׳` : "—"}
        </span>
      </li>
    );
  };

  // ---- success / results panel -------------------------------------------
  if (status === "done") {
    return (
      <div className={className}>
        {showJsonPanel && (
          <ReportJsonPanel
            report={report}
            open={jsonOpen}
            onClose={() => setJsonOpen(false)}
            side={jsonSide}
          />
        )}
        {showReportView && (
          <ReportSheet
            report={report}
            fileName={fileName}
            open={reportOpen}
            onClose={() => setReportOpen(false)}
          />
        )}

        <div className="animate-fade-in-up rounded-2xl border border-emerald-200 bg-gradient-to-l from-emerald-50/60 to-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white">
                <CheckCircle2 className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                  <span className="truncate">{report?.client.name || "לקוח"}</span>
                  {report?.client.idNumber && (
                    <span className="shrink-0 font-mono text-[11px] font-medium text-slate-400" dir="ltr">
                      ת.ז {report.client.idNumber}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500">
                  יובאו {chosen.length} הלוואות ומשכנתאות · יתרה{" "}
                  <span className="font-semibold text-[#1d75a1]">{shekel(totalBalance)}</span>
                </div>
                <div className="truncate text-[10px] text-slate-400">
                  מתוך <FileText className="inline size-3 -mt-0.5" /> {fileName}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {showJsonPanel && (
                <button
                  onClick={() => setJsonOpen(true)}
                  className="flex items-center gap-1 rounded-lg bg-[#1d75a1] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#155f84]"
                >
                  <FileJson className="size-3.5" />
                  נתוני הדוח
                </button>
              )}
              <button
                onClick={reset}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <RotateCcw className="size-3.5" />
                החלף
              </button>
            </div>
          </div>

          {showReportView && (
            <button
              onClick={() => setReportOpen(true)}
              className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-right transition hover:border-[#1d75a1]/40 hover:bg-slate-50"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#1d75a1]/10 text-[#1d75a1]">
                  <ScrollText className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold text-slate-800">צפייה בדוח האשראי המלא</span>
                  <span className="block truncate text-[11px] text-slate-400">
                    כל הפרמטרים, עסקאות, מסלולי ריבית, חיפוש ומילון מונחים
                  </span>
                </span>
              </span>
              <ChevronLeft className="size-4 shrink-0 text-slate-400" />
            </button>
          )}

          {showCandidates && injectables.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
                <span>הלוואות ומשכנתאות — מוזרמות אוטומטית למחשבון</span>
                <span className="text-slate-400">סמנו/בטלו</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {injectables.map((l) => renderDebtRow(l, true))}
              </ul>
            </div>
          )}

          {showCandidates && others.length > 0 && (
            <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
                <span>חובות נוספים — לצפייה בלבד (לא מוזרמים)</span>
                <span className="font-bold text-slate-600">{shekel(othersTotal)}</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {others.map((l) => renderDebtRow(l, false))}
              </ul>
            </div>
          )}

          {showCandidates && injectables.length > 0 && chosen.length === 0 && (
            <div className="mt-2 text-center text-[11px] text-slate-400">
              לא נבחרו הלוואות — טבלת המחשבון רוקנה.
            </div>
          )}

          {showCandidates && candidates.length === 0 && (
            <div className="mt-2 text-center text-[11px] text-slate-400">
              לא נמצאו חובות פעילים בדוח.
              {showJsonPanel && " פתחו את «נתוני הדוח» לפירוט המלא."}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- idle / loading / error --------------------------------------------
  const loading = status === "loading";
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!loading) setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (!loading) handleFile(e.dataTransfer.files?.[0]);
      }}
      onClick={() => !loading && inputRef.current?.click()}
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-3.5 transition-all",
        drag
          ? "border-[#1d75a1] bg-[#1d75a1]/5 ring-4 ring-[#1d75a1]/10"
          : status === "error"
          ? "border-red-200 bg-red-50/40"
          : "border-slate-300 bg-white hover:border-[#1d75a1]/50 hover:bg-slate-50/60",
        loading && "pointer-events-none",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-xl transition-transform",
          status === "error"
            ? "bg-red-100 text-red-500"
            : drag
            ? "scale-110 bg-[#1d75a1] text-white"
            : "bg-gradient-to-br from-[#2f8fbd] to-[#0f4f6e] text-white group-hover:scale-105"
        )}
      >
        {loading ? (
          <Loader2 className="size-5 animate-spin" />
        ) : status === "error" ? (
          <AlertTriangle className="size-5" />
        ) : (
          <UploadCloud className="size-5" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-slate-800">
          {loading
            ? "מנתח את הדוח…"
            : status === "error"
            ? "לא הצלחנו לקרוא את הדוח"
            : title ?? "גררו לכאן דוח ריכוז נתונים"}
        </div>
        <div className="truncate text-[11px] text-slate-400">
          {loading
            ? "מחלץ הלוואות ומשכנתאות מהדוח. רגע אחד."
            : status === "error"
            ? error
            : hint ?? "PDF של מערכת נתוני אשראי — חילוץ אוטומטי של ההלוואות."}
        </div>
      </div>

      {!loading && (
        <span
          className={cn(
            "shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition",
            status === "error"
              ? "bg-red-500 hover:bg-red-600"
              : "bg-[#1d75a1] hover:bg-[#155f84]"
          )}
        >
          {status === "error" ? (
            <span className="flex items-center gap-1">
              <X className="size-3.5" />
              נסו שוב
            </span>
          ) : (
            "בחירת קובץ"
          )}
        </span>
      )}
    </div>
  );
}
