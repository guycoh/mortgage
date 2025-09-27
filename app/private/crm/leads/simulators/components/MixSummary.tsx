// MixSummary.tsx
"use client";

import { calculateMixTotals } from "./calculate/mixCalculators";
import { Loan } from "./calculate/loanCalculators";

interface Mix {
  id: string;
  mix_name: string;
  loans?: Loan[];
}

interface MixSummaryProps {
  mixes: Mix[];
  activeMixId: string | null;
  compareMixId?: string | null;
  isIndexed?: boolean;
  annualInflation?: number;
}

export default function MixSummary({
  mixes,
  activeMixId,
  compareMixId,
  isIndexed = false,
  annualInflation = 0,
}: MixSummaryProps) {
  if (!activeMixId) return <p>לא נבחר תמהיל</p>;

  const activeMix = mixes.find((m) => m.id === activeMixId);
  const compareMix = mixes.find((m) => m.id === compareMixId);

  if (!activeMix) return <p>תמהיל לא נמצא</p>;

  // מחשבים סיכומים
  const activeTotals = calculateMixTotals(
    activeMix.loans || [],
    isIndexed,
    annualInflation,
    activeMix.id
  );

  const compareTotals = compareMix
    ? calculateMixTotals(
        compareMix.loans || [],
        isIndexed,
        annualInflation,
        compareMix.id
      )
    : null;

  // שורות הטבלה
  const rows = [
    { key: "mixTotalAmount", label: "סך ההלוואות" },
    { key: "mixTotalPrincipal", label: "סך הקרן" },
    { key: "mixTotalInterest", label: "סך הריבית" },
    { key: "mixTotalPaid", label: "סך התשלום הכולל" },
    { key: "mixTotalMonthlyPayment", label: "סך החזר ראשוני" },
    { key: "mixPeakMonthlyPayment", label: "תשלום חודשי בשיא" },
  ] as const;

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold text-center text-gray-800 mb-4">
        השוואת תמהילים
      </h2>

      <table className="table-fixed w-full border-collapse border rounded-lg shadow-lg text-sm">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="w-1/4 px-4 py-3 border text-right">פרמטר</th>
            <th className="w-1/4 px-4 py-3 border text-center">
              {activeMix.mix_name}
            </th>
            <th className="w-1/4 px-4 py-3 border text-center">
              {compareMix ? compareMix.mix_name : "תמהיל להשוואה"}
            </th>
            <th className="w-1/4 px-4 py-3 border text-center">פער</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, i) => {
            const activeVal = Math.round((activeTotals as any)[row.key]);
            const compareVal = compareTotals
              ? Math.round((compareTotals as any)[row.key])
              : null;

            const diff =
              compareVal !== null ? compareVal - activeVal : null;

            return (
              <tr
                key={row.key}
                className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                {/* פרמטר */}
                <td className="px-4 py-3 border font-medium text-right">
                  {row.label}
                </td>

                {/* ערך תמהיל נוכחי */}
                <td className="px-4 py-3 border text-center font-medium text-gray-800">
                  {Number.isFinite(activeVal)
                    ? activeVal.toLocaleString("he-IL")
                    : "-"}
                </td>

                {/* ערך תמהיל להשוואה */}
                <td className="px-4 py-3 border text-center font-medium text-gray-800">
                  {compareVal !== null
                    ? compareVal.toLocaleString("he-IL")
                    : "-"}
                </td>

                {/* פער */}
                <td
                  className={`px-4 py-3 border text-center font-semibold ${
                    diff !== null
                      ? diff < 0
                        ? "text-red-600"
                        : diff > 0
                        ? "text-green-600"
                        : ""
                      : ""
                  }`}
                >
                  {diff !== null
                    ? Math.round(diff).toLocaleString("he-IL")
                    : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
