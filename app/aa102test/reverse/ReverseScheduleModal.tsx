"use client";

// לוח סילוקין — the same six columns the original table printed, on the
// simulator's modal shell so a schedule opened here and a schedule opened from
// the ledger are the same object.
//
// Two things the original could not do, both of them about 361 rows: it opens
// on a year view (thirty lines instead of three hundred and sixty, the flows
// summed and the balances taken from the ends), and it leaves as a CSV.

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { DownloadSimple, X } from "@phosphor-icons/react";
import Money from "../components/Money";
import { byYear, type Plan } from "./reverse-math";

export type Tone = { color: string; text: string; tint: string; line: string };

export default function ReverseScheduleModal({
  plan,
  title,
  say,
  tone,
  principal,
  onClose,
}: {
  plan: Plan;
  title: string;
  /** The one line that says what this product does, repeated from its card. */
  say: string;
  tone: Tone;
  principal: number;
  onClose: () => void;
}) {
  const [grain, setGrain] = useState<"year" | "month">("year");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const yearly = useMemo(() => byYear(plan.rows), [plan.rows]);
  // Month 0 is the drawdown and belongs to no year, so the year view opens on
  // it too — otherwise the first line of the table is a balance that has
  // already grown, with nothing saying where it started.
  const rows = grain === "month" ? plan.rows : [plan.rows[0], ...yearly].filter(Boolean);
  const unit = grain === "month" ? "חודש" : "שנה";

  const exportCsv = () => {
    const head = `${unit},יתרת פתיחה,ריבית,הצמדה למדד,תשלום,יתרת סגירה`;
    const body = rows
      .map((r) =>
        [
          r.month,
          Math.round(r.startBalance),
          Math.round(r.interest),
          Math.round(r.index),
          Math.round(r.payment),
          Math.round(r.endBalance),
        ].join(",")
      )
      .join("\n");
    // BOM, so Excel opens the Hebrew header as UTF-8 rather than as mojibake
    const blob = new Blob([`﻿${head}\n${body}`], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/[\\/:*?"<>|]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

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
        className="lgr-card flex max-h-[86vh] w-full max-w-5xl flex-col overflow-hidden"
        style={{ boxShadow: "var(--shadow-lift)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="lgr-head" style={{ borderTop: `3px solid ${tone.color}`, paddingTop: 11 }}>
          <div className="min-w-0">
            <h2 className="lgr-title" style={{ color: tone.text }}>
              {title}
            </h2>
            <p className="mt-0.5 text-[12px]" style={{ color: "var(--lgr-3)" }}>
              {say}
            </p>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <div className="lgr-rm-seg" role="group" aria-label="רזולוציית הלוח">
              {(
                [
                  ["year", "שנתי"],
                  ["month", "חודשי"],
                ] as const
              ).map(([k, label]) => (
                <button key={k} data-on={grain === k} onClick={() => setGrain(k)}>
                  {label}
                </button>
              ))}
            </div>
            <button className="lgr-btn lgr-btn-sm" onClick={exportCsv}>
              <DownloadSimple size={13} weight="bold" />
              ייצוא CSV
            </button>
            <button className="lgr-act" onClick={onClose} aria-label="סגירה">
              <X size={15} weight="bold" />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 border-b md:grid-cols-4" style={{ borderColor: "var(--line)" }}>
          {[
            { label: "קרן ההלוואה", v: principal, color: undefined },
            { label: 'סה"כ ריבית', v: plan.interest, color: tone.text },
            { label: 'סה"כ מדד', v: plan.index, color: undefined },
            { label: "יתרה לסילוק בתום התקופה", v: plan.endBalance, color: undefined },
          ].map((c, i) => (
            <div
              key={c.label}
              className="px-4 py-2.5"
              style={{ borderInlineStart: i ? "1px solid var(--line)" : undefined }}
            >
              <div className="lgr-label">{c.label}</div>
              <Money value={c.v} className="mt-0.5" size={17} weight={700} color={c.color} style={{ textAlign: "start" }} />
            </div>
          ))}
        </div>

        <div className="lgr-scroll flex-1 overflow-auto">
          <table className="lgr-table">
            <thead>
              <tr>
                <th style={{ width: 74 }}>{unit}</th>
                <th>יתרת פתיחה</th>
                <th>ריבית</th>
                <th>הצמדה למדד</th>
                <th>תשלום</th>
                <th>יתרת סגירה</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const zero = r.month === 0;
                return (
                  <tr key={`${grain}-${r.month}`} className={zero ? "lgr-rm-zero" : undefined}>
                    <td className="lgr-fig ps-3 text-[12px]" style={{ color: zero ? "var(--lgr-4)" : "var(--lgr-3)" }}>
                      {zero ? "קבלה" : r.month}
                    </td>
                    {zero ? (
                      <>
                        <td colSpan={4}>
                          <span className="lgr-rm-nil text-[12px]">משיכת הכספים — טרם נצברו ריבית או הצמדה</span>
                        </td>
                        <td>
                          <Money value={r.endBalance} weight={700} color="var(--ink)" />
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <Money value={r.startBalance} color="var(--lgr-4)" weight={500} />
                        </td>
                        <td>
                          <Money value={r.interest} color={tone.text} />
                        </td>
                        <td>
                          <Money value={r.index} color="var(--lgr-2)" />
                        </td>
                        <td>
                          {r.payment > 0 ? (
                            <Money value={r.payment} weight={700} color="var(--ink)" />
                          ) : (
                            <span className="lgr-rm-nil text-[12px]">אין תשלום</span>
                          )}
                        </td>
                        <td>
                          <Money value={r.endBalance} weight={600} color="var(--ink)" />
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
