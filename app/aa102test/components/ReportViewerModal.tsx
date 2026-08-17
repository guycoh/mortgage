"use client";

// The original document, on screen.
//
// The ledger is a reading of the report; sometimes you need the report. Rather
// than send the advisor back to their downloads folder, the dropped PDF is kept
// in memory for the session and rendered here by the browser's own viewer —
// which brings page navigation, zoom, search and text selection for free.
//
// Nothing is uploaded. The object URL points at the File the user dropped, and
// it is revoked when the modal closes.

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { DownloadSimple, IdentificationCard, X } from "@phosphor-icons/react";
import type { ImportSummary } from "../lib/credit";

export default function ReportViewerModal({
  reports,
  onClose,
}: {
  reports: ImportSummary[];
  onClose: () => void;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // One URL per file, revoked together on unmount. Building them during render
  // would leak an object URL on every unrelated re-render.
  const urls = useMemo(
    () => reports.map((r) => (r.file ? URL.createObjectURL(r.file) : "")),
    [reports]
  );
  useEffect(() => () => urls.forEach((u) => u && URL.revokeObjectURL(u)), [urls]);

  const current = reports[active];
  const url = urls[active];

  return createPortal(
    <div
      dir="rtl"
      className="lgr-vars fixed inset-0 z-[120] grid place-items-center p-4 backdrop-blur-[2px]"
      style={{ background: "rgba(14,21,36,.55)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="lgr-card flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden"
        style={{ boxShadow: "var(--shadow-lift)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={current?.bank ? "תדפיס משכנתא" : "חיווי אשראי"}
      >
        <header className="lgr-head">
          {/* The title names the document being looked at. It was hardcoded
              "חיווי אשראי", so a bank payoff letter — the other thing this
              viewer opens — was headed as a credit report. */}
          <h2 className="lgr-title">{current?.bank ? "תדפיס משכנתא" : "חיווי אשראי"}</h2>

          {reports.length > 1 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {/* With two documents the client's name is not enough to tell
                  them apart — a client's own credit report and their own bank
                  letter carry the same name, and so do the same file dropped
                  twice. The tab says which FILE it is. */}
              {reports.map((r, i) => (
                <button
                  key={`${r.clientId}-${i}`}
                  className="lgr-tab"
                  data-on={i === active || undefined}
                  onClick={() => setActive(i)}
                  title={`${r.clientName || "דוח"} · ${r.fileName}${r.reportDate ? ` · ${r.reportDate}` : ""}`}
                >
                  <IdentificationCard size={13} />
                  <span className="truncate" style={{ maxWidth: 190 }}>
                    {r.fileName || r.clientName || `דוח ${i + 1}`}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <span className="lgr-chip" style={{ color: "var(--lgr-3)" }}>
              <span className="truncate" style={{ maxWidth: 260 }} title={current?.fileName}>
                {current?.fileName || "—"}
              </span>
            </span>
          )}

          {current?.reportDate && (
            <span className="text-[11.5px]" style={{ color: "var(--lgr-4)" }}>
              דוח מ־{current.reportDate}
            </span>
          )}

          <div className="ms-auto flex items-center gap-1.5">
            {url && (
              <a
                className="lgr-btn lgr-btn-sm"
                href={url}
                download={current?.fileName || "credit-report.pdf"}
              >
                <DownloadSimple size={13} weight="bold" />
                הורדה
              </a>
            )}
            <button className="lgr-act" onClick={onClose} aria-label="סגירה">
              <X size={15} weight="bold" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1" style={{ background: "var(--bg-2)" }}>
          {url ? (
            <iframe
              key={url}
              src={`${url}#view=FitH`}
              title={current?.fileName || "חיווי אשראי"}
              className="h-full w-full"
              style={{ border: 0, display: "block" }}
            />
          ) : (
            <div className="grid h-full place-items-center px-6 text-center">
              <div>
                <div className="lgr-display text-[16px]">הקובץ אינו זמין לצפייה</div>
                <p className="mt-1.5 text-[12.5px]" style={{ color: "var(--lgr-3)" }}>
                  הדוח נטען בהפעלה קודמת של הדף. גררו אותו שוב כדי לצפות במסמך המקורי.
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
