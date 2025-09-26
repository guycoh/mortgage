// MixedTotals.tsx

"use client";

import { MixTotals as MixTotalsType } from "./calculate/mixCalculators";

interface Mix {
  id: string;
  mix_name: string;
}

interface MixTotalsProps {
  totals: MixTotalsType[];
  mixes: Mix[];
  activeMixId: string | null;
  compareMixId: string | null;
}

export default function MixTotals({
  totals,
  mixes,
  activeMixId,
  compareMixId,
}: MixTotalsProps) {
  if (!totals.length) return <p>לא נמצאו תמהילים להצגה</p>;

  const getMixName = (mix_id: string) => {
    const mix = mixes.find((m) => m.id === mix_id);
    return mix?.mix_name || mix_id;
  };

  // נבנה מערך של שני התמהילים להשוואה
  const totalsToShow = [
    totals.find((t) => t.mix_id === activeMixId),
    totals.find((t) => t.mix_id === compareMixId),
  ].filter(Boolean) as MixTotalsType[];

  if (!totalsToShow.length) return <p>בחר תמהיל להשוואה</p>;

  const rows = [
    { key: "totalAmount", label: "סך ההלוואות" },
    { key: "totalMonthlyPayment", label: "סך החזר חודשי" },
    { key: "maxMonthlyPayment", label: "תשלום חודשי מקסימלי" },
  ] as const;

  return (
    <div className="mt-6">
      <table className="table-fixed w-full border-collapse border rounded-lg shadow-lg text-sm">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="w-1/4 px-4 py-3 border text-right">פרמטר</th>
            {totalsToShow.map((mix, idx) => (
            <th
                key={`${mix.mix_id}-${idx}`}
                className="w-1/4 px-4 py-3 border text-center"
            >
                {getMixName(mix.mix_id)}
            </th>
            ))}

            {totalsToShow.length === 2 && (
              <th className="w-1/4 px-4 py-3 border text-center">הפרש</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const values = totalsToShow.map(
              (mix) => (mix as any)[row.key] as number
            );
            const diff =
              totalsToShow.length === 2 ? values[1] - values[0] : null;

            return (
              <tr
                key={row.key}
                className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="px-4 py-3 border font-medium text-right">
                  {row.label}
                </td>
                {values.map((val, idx) => (
                  <td
                    key={idx}
                    className="px-4 py-3 border text-center font-medium text-gray-800"
                  >
                    {Number.isFinite(val) ? val.toLocaleString("he-IL") : "-"}
                  </td>
                ))}
                {diff !== null && (
                  <td
                    className={`px-4 py-3 border text-center font-semibold ${
                      diff < 0 ? "text-green-600" : diff > 0 ? "text-red-600" : ""
                    }`}
                  >
                    {diff.toLocaleString("he-IL")}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
