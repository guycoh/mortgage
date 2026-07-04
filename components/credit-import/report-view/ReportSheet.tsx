"use client";

// Full-screen sheet that hosts the rich, searchable report view (the same
// dashboard as credit-report-viewer.vercel.app), rendered from the in-browser
// parsed report.

import { cn } from "@/lib/utils";
import type { CreditReport } from "@/lib/credit-parser/types";
import { ReportView } from "./ReportView";

export default function ReportSheet({
  report,
  fileName,
  open,
  onClose,
}: {
  report: CreditReport | null;
  fileName: string;
  open: boolean;
  onClose: () => void;
}) {
  if (!report) return null;
  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] transition-opacity duration-300",
        open ? "opacity-100" : "pointer-events-none opacity-0"
      )}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "absolute inset-0 overflow-y-auto bg-slate-50 transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-2"
        )}
      >
        <ReportView report={report} fileName={fileName} onClose={onClose} />
      </div>
    </div>
  );
}
