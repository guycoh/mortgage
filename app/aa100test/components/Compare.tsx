"use client";

// Head-to-head between the active mix and one other. Every row is a cost, so a
// NEGATIVE difference (the active mix costs less) is the good outcome and reads
// green; a positive one reads red. עלות לשקל is the ratio, not a currency.

import {
  calculateMixFullTotals,
  type MixFullTotals,
} from "@/app/private/crm/leads/simulators/components/calculate/mixScheduleCalculators";
import type { ImportedLoan } from "../lib/credit";

type Mix = { id: string; mix_name: string; loans?: ImportedLoan[] };

const ROWS = [
  { label: "סכום המשכנתא", field: "originalLoanAmount" },
  { label: "סך הקרן", field: "totalPrincipal" },
  { label: "סך הריבית", field: "totalInterest" },
  { label: "תשלום ראשון", field: "firstPayment" },
  { label: "תשלום השיא", field: "maxPayment" },
  { label: "עלות כוללת", field: "totalPayment" },
  { label: "עלות לשקל", field: "costPerShekel" },
] as const;

const nis = (v: number) => Math.round(v || 0).toLocaleString("he-IL");
const ratio = (v: number) => (isFinite(v) ? v.toFixed(2) : "0.00");

export default function Compare({
  activeMixId,
  compareMixId,
  mixes,
  annualInflation = 0,
}: {
  activeMixId: string | null;
  compareMixId: string | null;
  mixes: Mix[];
  annualInflation?: number;
}) {
  const activeMix = mixes.find((m) => m.id === activeMixId);
  const compareMix = compareMixId ? mixes.find((m) => m.id === compareMixId) : null;

  if (!activeMix) return <div className="fin-empty">בחרו תמהיל להצגה.</div>;
  if (!activeMix.loans?.length)
    return <div className="fin-empty">אין נתונים להצגה עבור התמהיל הנוכחי — הזינו סכומים או גררו דוח.</div>;

  const active: MixFullTotals = calculateMixFullTotals(activeMix.loans, annualInflation);
  const other: MixFullTotals | null =
    compareMix && compareMix.loans?.length
      ? calculateMixFullTotals(compareMix.loans, annualInflation)
      : null;

  const valueOf = (t: MixFullTotals | null, field: string) => {
    if (!t) return 0;
    if (field === "costPerShekel")
      return t.originalLoanAmount ? t.totalPayment / t.originalLoanAmount : 0;
    return (t[field as keyof MixFullTotals] as number) || 0;
  };

  return (
    <div className="fin-scroll overflow-x-auto">
      <table className="fin-table w-full table-fixed">
        <thead>
          <tr>
            <th style={{ width: "28%" }}>שדה</th>
            <th style={{ width: "24%" }} data-num="true">
              {activeMix.mix_name}
            </th>
            <th style={{ width: "24%" }} data-num="true">
              {compareMix?.mix_name ?? "—"}
            </th>
            <th style={{ width: "24%" }} data-num="true">
              הפרש
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => {
            const isRatio = row.field === "costPerShekel";
            const a = valueOf(active, row.field);
            const b = valueOf(other, row.field);
            const diff = a - b;
            const fmt = isRatio ? ratio : nis;
            // cheaper is better, so a negative difference is the win
            const color = !other || diff === 0 ? "var(--ink-4)" : diff < 0 ? "var(--pos)" : "var(--neg)";

            return (
              <tr key={row.field} className="fin-row">
                <td className="text-[12.5px] font-bold" style={{ color: "var(--ink-2)" }}>
                  {row.label}
                </td>
                <td>
                  <span className="fin-calc font-bold" style={{ color: "var(--ink)" }}>
                    {fmt(a)}
                    {!isRatio && <span className="fin-cur">₪</span>}
                  </span>
                </td>
                <td>
                  <span className="fin-calc" data-muted={!other || undefined}>
                    {other ? (
                      <>
                        {fmt(b)}
                        {!isRatio && <span className="fin-cur">₪</span>}
                      </>
                    ) : (
                      "—"
                    )}
                  </span>
                </td>
                <td>
                  <span className="fin-calc font-bold" style={{ color }}>
                    {other ? (
                      <>
                        {diff > 0 ? "+" : ""}
                        {fmt(diff)}
                        {!isRatio && <span className="fin-cur">₪</span>}
                      </>
                    ) : (
                      "—"
                    )}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!other && (
        <p className="px-3 py-2.5 text-[11.5px]" style={{ color: "var(--ink-4)" }}>
          בחרו תמהיל להשוואה בסרגל העליון כדי לראות את ההפרשים.
        </p>
      )}
    </div>
  );
}
