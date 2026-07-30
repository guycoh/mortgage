"use client";

// לוח סילוקין — one modal, two subjects: the whole mix (unified) or a single
// row. Same shell, same table, same CSV export, so there is nothing new to
// learn between them.

import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { DownloadSimple, X } from "@phosphor-icons/react";
import {
  calculateLoan,
  type ScheduleRow,
} from "@/app/private/crm/leads/simulators/components/calculate/loanCalculators";
import { calculateUnifiedSchedule } from "@/app/private/crm/leads/simulators/components/calculate/mixScheduleCalculators";
import Money from "./Money";
import { FAMILY, PATH_LABEL, TRACK_HEX, type ImportedLoan } from "../lib/credit";

type Subject =
  | { kind: "mix"; name: string; loans: ImportedLoan[] }
  | { kind: "loan"; loan: ImportedLoan };

export default function ScheduleModal({
  subject,
  annualInflation,
  onClose,
}: {
  subject: Subject;
  annualInflation: number;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const { rows, title, badges, summary } = useMemo(() => {
    if (subject.kind === "mix") {
      const s = calculateUnifiedSchedule(subject.loans, annualInflation);
      const rows: ScheduleRow[] = s.map((r) => ({
        month: r.month,
        payment: r.totalPayment,
        principal: r.totalPrincipal,
        interest: r.totalInterest,
        openingBalance: r.openingBalance,
        closingBalance: r.closingBalance,
      }));
      return {
        rows,
        title: `לוח סילוקין מאוחד — ${subject.name}`,
        badges: (
          <span className="lgr-chip">
            <span className="lgr-fig font-bold">{subject.loans.length}</span> שורות בתמהיל
          </span>
        ),
        summary: {
          first: rows[0]?.payment ?? 0,
          max: rows.reduce((m, r) => Math.max(m, r.payment), 0),
          principal: rows.reduce((s2, r) => s2 + r.principal, 0),
          interest: rows.reduce((s2, r) => s2 + r.interest, 0),
        },
      };
    }
    const res = calculateLoan(subject.loan, annualInflation);
    const fam = FAMILY[subject.loan.group === "loan" ? "loan" : "mortgage"];
    return {
      rows: res.schedule,
      title: `לוח סילוקין — ${fam.label}`,
      badges: (
        <>
          <span
            className="lgr-chip"
            style={{ borderColor: fam.line, background: fam.tint, color: fam.text }}
          >
            {fam.label}
          </span>
          <span className="lgr-chip">
            <span className="lgr-dot" style={{ background: TRACK_HEX[subject.loan.path_id] }} />
            {PATH_LABEL[subject.loan.path_id]}
          </span>
          {res.isIndexed && <span className="lgr-chip">צמוד מדד</span>}
        </>
      ),
      summary: {
        first: res.monthlyPayment,
        max: res.maxMonthlyPayment,
        principal: res.totalPrincipal,
        interest: res.totalInterest,
      },
    };
  }, [subject, annualInflation]);

  const exportCsv = () => {
    const head = "חודש,יתרת פתיחה,תשלום חודשי,קרן,ריבית,יתרת סגירה";
    const body = rows
      .map((r) =>
        [
          r.month,
          Math.round(r.openingBalance),
          Math.round(r.payment),
          Math.round(r.principal),
          Math.round(r.interest),
          Math.round(r.closingBalance),
        ].join(",")
      )
      .join("\n");
    // BOM so Excel opens the Hebrew header in UTF-8
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
        <header className="lgr-head">
          <h2 className="lgr-title">{title}</h2>
          <div className="flex items-center gap-1.5">{badges}</div>
          <div className="ms-auto flex items-center gap-1.5">
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
            { label: "תשלום ראשון", v: summary.first },
            { label: "תשלום בשיא", v: summary.max },
            { label: "סך קרן", v: summary.principal },
            { label: "סך ריבית", v: summary.interest },
          ].map((c, i) => (
            <div
              key={c.label}
              className="px-4 py-2.5"
              style={{ borderInlineStart: i ? "1px solid var(--line)" : undefined }}
            >
              <div className="lgr-label">{c.label}</div>
              <Money value={c.v} className="mt-0.5" size={17} weight={700} style={{ textAlign: "start" }} />
            </div>
          ))}
        </div>

        <div className="lgr-scroll flex-1 overflow-auto">
          <table className="lgr-table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>חודש</th>
                <th data-num="true">יתרת פתיחה</th>
                <th data-num="true">תשלום חודשי</th>
                <th data-num="true">קרן</th>
                <th data-num="true">ריבית</th>
                <th data-num="true">יתרת סגירה</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.month} className="lgr-row">
                  <td className="lgr-fig ps-3 text-[12px]" style={{ color: "var(--lgr-3)" }}>
                    {r.month}
                  </td>
                  <td>
                    <Money value={r.openingBalance} color="var(--lgr-4)" weight={500} />
                  </td>
                  <td>
                    <Money value={r.payment} weight={700} color="var(--ink)" />
                  </td>
                  <td>
                    <Money value={r.principal} color="var(--lgr-2)" />
                  </td>
                  <td>
                    <Money value={r.interest} color="var(--loan)" />
                  </td>
                  <td>
                    <Money value={r.closingBalance} color="var(--lgr-4)" weight={500} />
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={6}>
                    <div className="lgr-empty">אין נתונים — לשורות אין סכום או תקופה.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
