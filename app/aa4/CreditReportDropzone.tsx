"use client";

// Compact drag-and-drop for the Israeli "דוח ריכוז נתונים" (Credit Data System
// report). Parses the PDF entirely in the browser, streams the extracted loans
// & mortgages into the consolidation calculator on /aa4, and opens a side panel
// with the full report as organized JSON.

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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parsePdfFile } from "@/lib/credit-parser/extract.client";
import {
  extractLoans,
  toLoanRows,
  type ExtractedLoan,
  type LoanRow,
} from "@/lib/credit-parser/loan-mapping";
import type { CreditReport } from "@/lib/credit-parser/types";
import ReportJsonPanel from "./ReportJsonPanel";

type Status = "idle" | "loading" | "done" | "error";

interface Props {
  /** Rows to load into the "הלוואות קיימות" calculator (active loans & mortgages). */
  onImport: (rows: LoanRow[]) => void;
  /** Fired once after a successful import (e.g. to scroll/highlight). */
  onImported?: () => void;
}

const shekel = (n: number) => `${Math.round(n).toLocaleString("en-US")} ₪`;

export default function CreditReportDropzone({ onImport, onImported }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [loans, setLoans] = useState<ExtractedLoan[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [report, setReport] = useState<CreditReport | null>(null);
  const [jsonOpen, setJsonOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const emit = useCallback(
    (all: ExtractedLoan[], sel: Set<string>) => {
      onImport(toLoanRows(all.filter((l) => sel.has(l.uid))));
    },
    [onImport]
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
        const sel = new Set(all.filter((l) => l.defaultInclude).map((l) => l.uid));
        setReport(parsed);
        setLoans(all);
        setSelected(sel);
        setStatus("done");
        emit(all, sel);
        onImported?.();
        setJsonOpen(true); // pop the full-report panel open
      } catch (e) {
        setStatus("error");
        setError((e as Error).message || "לא ניתן לקרוא את הקובץ.");
      }
    },
    [emit, onImported]
  );

  const toggle = (uid: string) => {
    const next = new Set(selected);
    if (next.has(uid)) next.delete(uid);
    else next.add(uid);
    setSelected(next);
    emit(loans, next);
  };

  const reset = () => {
    setStatus("idle");
    setError("");
    setFileName("");
    setLoans([]);
    setSelected(new Set());
    setReport(null);
    setJsonOpen(false);
    onImport([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  // Only real loans & mortgages are candidates for the calculator; revolving
  // facilities / overdrafts / guarantees stay in the JSON panel only.
  const candidates = loans.filter((l) => l.isLoanOrMortgage);
  const chosen = candidates.filter((l) => selected.has(l.uid));
  const totalBalance = chosen.reduce((s, l) => s + l.balance, 0);

  // ---- success / results panel -------------------------------------------
  if (status === "done") {
    return (
      <>
        <ReportJsonPanel report={report} open={jsonOpen} onClose={() => setJsonOpen(false)} />

        <div className="animate-fade-in-up rounded-2xl border border-emerald-200 bg-gradient-to-l from-emerald-50/60 to-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white">
                <CheckCircle2 className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-800">
                  יובאו {chosen.length} הלוואות ומשכנתאות · יתרה כוללת{" "}
                  <span className="text-[#1d75a1]">{shekel(totalBalance)}</span>
                </div>
                <div className="truncate text-[11px] text-slate-400">
                  מתוך <FileText className="inline size-3 -mt-0.5" /> {fileName}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={() => setJsonOpen(true)}
                className="flex items-center gap-1 rounded-lg bg-[#1d75a1] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#155f84]"
              >
                <FileJson className="size-3.5" />
                נתוני הדוח
              </button>
              <button
                onClick={reset}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <RotateCcw className="size-3.5" />
                החלף
              </button>
            </div>
          </div>

          {candidates.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
                הלוואות ומשכנתאות פעילות — סמנו מה להזרים למחשבון
              </div>
              <ul className="divide-y divide-slate-100">
                {candidates.map((l) => {
                  const on = selected.has(l.uid);
                  return (
                    <li
                      key={l.uid}
                      onClick={() => toggle(l.uid)}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 px-3 py-2 text-[11px] transition",
                        on
                          ? "bg-white hover:bg-slate-50/70"
                          : "bg-slate-50/40 opacity-60 hover:opacity-90"
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-4 shrink-0 place-items-center rounded border transition",
                          on ? "border-[#1d75a1] bg-[#1d75a1] text-white" : "border-slate-300 bg-white"
                        )}
                      >
                        {on && <CheckCircle2 className="size-3.5" />}
                      </span>
                      {l.isMortgage && <Landmark className="size-3.5 shrink-0 text-[#1d75a1]" />}
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-700">
                        {l.source}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold",
                          l.role === "debtor"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-amber-50 text-amber-600"
                        )}
                      >
                        {l.role === "debtor" ? "חייב" : "ערב"}
                      </span>
                      <span className="hidden shrink-0 text-slate-400 sm:inline">{l.type}</span>
                      <span className="w-[70px] shrink-0 text-left font-bold text-slate-800">
                        {shekel(l.balance)}
                      </span>
                      <span className="w-[42px] shrink-0 text-center text-slate-500">
                        {l.interest ? `${l.interest}%` : "—"}
                      </span>
                      <span className="w-[46px] shrink-0 text-center text-slate-500">
                        {l.months ? `${l.months} ח׳` : "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {chosen.length === 0 && candidates.length > 0 && (
            <div className="mt-2 text-center text-[11px] text-slate-400">
              לא נבחרו חובות — טבלת ההלוואות רוקנה.
            </div>
          )}

          {candidates.length === 0 && (
            <div className="mt-2 text-center text-[11px] text-slate-400">
              לא נמצאו הלוואות או משכנתאות פעילות בדוח. פתחו את «נתוני הדוח» לפירוט המלא.
            </div>
          )}
        </div>
      </>
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
        loading && "pointer-events-none"
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
            : "גררו לכאן דוח ריכוז נתונים"}
        </div>
        <div className="truncate text-[11px] text-slate-400">
          {loading
            ? "מחלץ הלוואות ומשכנתאות ומזרים למחשבון. רגע אחד."
            : status === "error"
            ? error
            : "PDF של מערכת נתוני אשראי — חילוץ אוטומטי של ההלוואות אל המחשבון."}
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
