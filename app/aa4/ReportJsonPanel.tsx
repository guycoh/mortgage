"use client";

// Slide-in side panel showing the full extracted credit report as an organized,
// collapsible JSON tree (react-json-view-lite) with copy / download.

import { useMemo, useState } from "react";
import { JsonView, defaultStyles, allExpanded } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import { X, Copy, Download, FileJson, ChevronsUpDown, ChevronsDownUp } from "lucide-react";
import type { CreditReport } from "@/lib/credit-parser/types";

interface Props {
  report: CreditReport | null;
  open: boolean;
  onClose: () => void;
}

export default function ReportJsonPanel({ report, open, onClose }: Props) {
  const [expandAll, setExpandAll] = useState(false);
  const pretty = useMemo(
    () => (report ? JSON.stringify(report, null, 2) : ""),
    [report]
  );

  if (!report) return null;

  const idName = `${report.client.name || "report"}-${report.client.idNumber || ""}`.trim();

  const copy = () => navigator.clipboard?.writeText(pretty);
  const download = () => {
    const blob = new Blob([pretty], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `credit-report-${report.client.idNumber || "data"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stat = (label: string, value: number | string) => (
    <div className="rounded-lg bg-white/10 px-2 py-1 text-center">
      <div className="text-[15px] font-bold leading-none">{value}</div>
      <div className="mt-0.5 text-[9px] text-white/70">{label}</div>
    </div>
  );

  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* drawer (slides in from the left edge) */}
      <aside
        dir="rtl"
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(92vw,460px)] flex-col bg-slate-50 shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* header */}
        <div className="bg-gradient-to-l from-[#0f4f6e] to-[#1d75a1] p-4 text-white">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileJson className="size-5" />
              <div>
                <div className="text-sm font-bold leading-tight">נתוני הדוח המלאים</div>
                <div className="text-[11px] text-white/75">{report.client.name || "—"}</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid size-7 place-items-center rounded-lg bg-white/10 transition hover:bg-white/20"
              aria-label="סגירה"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {stat("עסקאות", report.transactions.length)}
            {stat("פניות", report.inquiriesByDate.length)}
            {stat('הוצל"פ', report.execution.length)}
            {stat("התראות", report.nonPaymentIndicators.length)}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={copy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/15 py-1.5 text-[11px] font-semibold transition hover:bg-white/25"
            >
              <Copy className="size-3.5" />
              העתקה
            </button>
            <button
              onClick={download}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white py-1.5 text-[11px] font-semibold text-[#1d75a1] transition hover:bg-white/90"
            >
              <Download className="size-3.5" />
              הורדת JSON
            </button>
          </div>
          <div className="mt-2 truncate text-[10px] text-white/60" dir="ltr">
            ת.ז {report.client.idNumber || "—"} · {report.meta.reportDate || "—"} · {idName}
          </div>
        </div>

        {/* toolbar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-1.5">
          <span className="text-[11px] font-semibold text-slate-400">מבנה הדוח</span>
          <button
            onClick={() => setExpandAll((v) => !v)}
            className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            {expandAll ? (
              <>
                <ChevronsDownUp className="size-3.5" />
                כווץ הכל
              </>
            ) : (
              <>
                <ChevronsUpDown className="size-3.5" />
                הרחב הכל
              </>
            )}
          </button>
        </div>

        {/* JSON tree */}
        <div className="cdv-json min-h-0 flex-1 overflow-auto p-3" dir="ltr">
          <JsonView
            key={`${report.client.idNumber}-${expandAll}`}
            data={report as unknown as object}
            style={defaultStyles}
            shouldExpandNode={expandAll ? allExpanded : (level) => level < 1}
            clickToExpandNode
          />
        </div>
      </aside>
    </>
  );
}
