"use client";

// Head-to-head between the active mix and one other: the numbers on the right,
// the verdict on the left. Every row is a cost, so a NEGATIVE difference (the
// active mix costs less) is the good outcome and reads green; a positive one
// reads red. עלות לשקל is a ratio, not a currency.

import dynamic from "next/dynamic";
import {
  calculateMixFullTotals,
  type MixFullTotals,
} from "@/app/private/crm/leads/simulators/components/calculate/mixScheduleCalculators";
import Money from "./Money";
import type { DeltaRow } from "./CompareChart";
import { owedOnly, type ImportedLoan } from "../lib/credit";

// ECharts is a canvas library with no server render — load it in the browser only.
const CompareChart = dynamic(() => import("./CompareChart"), {
  ssr: false,
  loading: () => <div className="lgr-skel m-3 h-[268px]" />,
});

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

  if (!activeMix) return <div className="lgr-empty">בחרו תמהיל להצגה.</div>;
  if (!owedOnly(activeMix.loans ?? []).length)
    return <div className="lgr-empty">אין נתונים להצגה עבור התמהיל הנוכחי — הזינו סכומים או גררו דוח.</div>;

  // The client's own debts on both sides. A guarantee is somebody else's loan,
  // so counting it here would make one mix look dearer than another purely
  // because a spouse's cousin borrowed money. See isSurety in lib/credit.
  const active: MixFullTotals = calculateMixFullTotals(owedOnly(activeMix.loans ?? []), annualInflation);
  const otherRows = compareMix ? owedOnly(compareMix.loans ?? []) : [];
  const other: MixFullTotals | null = otherRows.length
    ? calculateMixFullTotals(otherRows, annualInflation)
    : null;

  const valueOf = (t: MixFullTotals | null, field: string) => {
    if (!t) return 0;
    if (field === "costPerShekel")
      return t.originalLoanAmount ? t.totalPayment / t.originalLoanAmount : 0;
    return (t[field as keyof MixFullTotals] as number) || 0;
  };

  const deltas: DeltaRow[] = ROWS.map((r) => ({
    label: r.label,
    active: valueOf(active, r.field),
    compare: valueOf(other, r.field),
    ratio: r.field === "costPerShekel",
  }));

  // one-line verdict, on the metric that decides a mortgage: total cost
  const totalDiff = valueOf(active, "totalPayment") - valueOf(other, "totalPayment");

  return (
    <div className="grid lg:grid-cols-2">
      {/* ---------------------------------------------------------- numbers */}
      <div className="lgr-scroll overflow-x-auto">
        <table className="lgr-table w-full table-fixed">
          <colgroup>
            <col style={{ width: "31%" }} />
            <col style={{ width: "23%" }} />
            <col style={{ width: "23%" }} />
            <col style={{ width: "23%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>שדה</th>
              <th className="truncate">{activeMix.mix_name}</th>
              <th className="truncate">{compareMix?.mix_name ?? "—"}</th>
              <th>הפרש</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const isRatio = row.field === "costPerShekel";
              const a = valueOf(active, row.field);
              const b = valueOf(other, row.field);
              // Round before judging. Two mixes with an identical principal
              // still differ by a float epsilon, which rendered as a red "+₪0".
              const diff = isRatio ? a - b : Math.round(a) - Math.round(b);
              // cheaper is better, so a negative difference is the win
              const color = !other || diff === 0 ? "var(--lgr-4)" : diff < 0 ? "var(--pos)" : "var(--neg)";

              return (
                <tr key={row.field} className="lgr-row">
                  <td className="text-[12.5px] font-bold" style={{ color: "var(--lgr-2)" }}>
                    {row.label}
                  </td>
                  <td>
                    {isRatio ? (
                      <span className="lgr-money lgr-money-block font-bold">{ratio(a)}</span>
                    ) : (
                      <Money value={a} weight={700} />
                    )}
                  </td>
                  <td>
                    {!other ? (
                      <span className="lgr-calc" data-muted="true">
                        —
                      </span>
                    ) : isRatio ? (
                      <span className="lgr-money lgr-money-block" style={{ color: "var(--lgr-3)" }}>
                        {ratio(b)}
                      </span>
                    ) : (
                      <Money value={b} color="var(--lgr-3)" />
                    )}
                  </td>
                  <td>
                    {!other ? (
                      <span className="lgr-calc" data-muted="true">
                        —
                      </span>
                    ) : isRatio ? (
                      <span className="lgr-money lgr-money-block font-bold" style={{ color }}>
                        {diff > 0 ? "+" : diff < 0 ? "−" : ""}
                        {ratio(Math.abs(diff))}
                      </span>
                    ) : (
                      <Money value={diff} sign weight={700} color={color} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ----------------------------------------------------------- verdict */}
      <div className="border-t lg:border-s lg:border-t-0" style={{ borderColor: "var(--line)" }}>
        {other && compareMix ? (
          <>
            <div
              className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b px-3.5 py-2.5"
              style={{ borderColor: "var(--line)" }}
            >
              <span className="lgr-display text-[15px]">
                {totalDiff < 0 ? "התמהיל הנוכחי זול יותר" : totalDiff > 0 ? "התמהיל הנוכחי יקר יותר" : "עלות זהה"}
              </span>
              {totalDiff !== 0 && (
                <Money
                  value={Math.abs(totalDiff)}
                  block={false}
                  weight={700}
                  size={15}
                  color={totalDiff < 0 ? "var(--pos)" : "var(--neg)"}
                />
              )}
              <span className="ms-auto text-[10.5px]" style={{ color: "var(--lgr-4)" }}>
                לאורך כל חיי ההלוואה, מול {compareMix.mix_name}
              </span>
            </div>
            <CompareChart rows={deltas} activeName={activeMix.mix_name} compareName={compareMix.mix_name} />
          </>
        ) : (
          <div className="lgr-empty h-full">
            בחרו תמהיל להשוואה בסרגל העליון —
            <br />
            כאן יופיע ההפרש באחוזים, שורה מול שורה.
          </div>
        )}
      </div>
    </div>
  );
}
