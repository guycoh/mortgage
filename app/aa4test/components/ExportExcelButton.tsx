"use client";

// "ייצוא לאקסל" — turns the imported reports and the liabilities board into a
// designed workbook. ExcelJS only loads on the first click, so the page's
// initial bundle is untouched.

import { useState } from "react";
import { MicrosoftExcelLogo, CircleNotch, Check, WarningCircle } from "@phosphor-icons/react";
import type { LiabilityRow, ReportSlot } from "@/components/credit-import";

type State = "idle" | "busy" | "done" | "error";

export default function ExportExcelButton({
  slots,
  rows,
}: {
  slots: ReportSlot[];
  rows: LiabilityRow[];
}) {
  const [state, setState] = useState<State>("idle");

  const run = async () => {
    if (state === "busy") return;
    setState("busy");
    try {
      const { exportLiabilitiesToExcel } = await import("../lib/excel-export");
      await exportLiabilitiesToExcel({ slots, rows });
      setState("done");
      setTimeout(() => setState("idle"), 2600);
    } catch (e) {
      console.error("Excel export failed", e);
      setState("error");
      setTimeout(() => setState("idle"), 4000);
    }
  };

  const { icon, label } = {
    idle: { icon: <MicrosoftExcelLogo className="size-4" weight="duotone" />, label: "ייצוא לאקסל" },
    busy: { icon: <CircleNotch className="size-4 animate-spin" />, label: "בונה את הקובץ" },
    done: { icon: <Check className="size-4" weight="bold" />, label: "הקובץ הורד" },
    error: { icon: <WarningCircle className="size-4" />, label: "הייצוא נכשל" },
  }[state];

  return (
    <button
      onClick={run}
      disabled={state === "busy" || !rows.length}
      title={`ייצוא ${rows.length} התחייבויות לקובץ Excel מעוצב`}
      className="aa4-btn aa4-btn-soft !px-3 !py-1.5 !text-[12px] disabled:cursor-not-allowed disabled:opacity-50"
      style={
        state === "done"
          ? { background: "var(--pos-tint)", color: "var(--pos-strong)" }
          : state === "error"
            ? { background: "var(--neg-tint)", color: "var(--neg-strong)" }
            : undefined
      }
    >
      {icon}
      {label}
    </button>
  );
}
