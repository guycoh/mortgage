
// MixComparisonTable.tsx
"use client";

import React from "react";
import { calculateUnifiedSchedule, calculateUnifiedTotals, CombinedTotals } from "./calculate/mixScheduleCalculators";
import { Loan } from "./calculate/loanCalculators";

interface Mix {
  id: string;
  mix_name: string;
  loans?: Loan[];
}

interface MixComparisonTableProps {
  activeMixId: string | null;
  compareMixId: string | null;
  mixes: Mix[];
  annualInflation?: number;
}

const MixComparisonTable: React.FC<MixComparisonTableProps> = ({
  activeMixId,
  compareMixId,
  mixes,
  annualInflation = 0,
}) => {
  if (!activeMixId) return <p>אנא בחר תמהיל להצגה.</p>;

  const activeMix = mixes.find((m) => m.id === activeMixId);
  const compareMix = compareMixId ? mixes.find((m) => m.id === compareMixId) : null;

  if (!activeMix || !activeMix.loans?.length)
    return <p>אין נתונים להצגה עבור התמהיל הנוכחי.</p>;

  const activeSchedule = calculateUnifiedSchedule(activeMix.loans, annualInflation);
  const activeTotals = calculateUnifiedTotals(activeSchedule);

  let compareTotals: CombinedTotals | null = null;
  if (compareMix && compareMix.loans?.length) {
    const compareSchedule = calculateUnifiedSchedule(compareMix.loans, annualInflation);
    compareTotals = calculateUnifiedTotals(compareSchedule);
  }

  const formatCurrency = (value: number) =>
    value.toLocaleString("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 });

  const rows = [
    { label: "סך הכל תשלום", field: "mixTotalPayment" },
    { label: "סך הקרן", field: "mixTotalPrincipal" },
    { label: "סך הריבית", field: "mixTotalInterest" },
    { label: "יתרת פתיחה", field: "mixOpeningBalance" },
    { label: "יתרת סגירה", field: "mixClosingBalance" },
  ];

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200 overflow-x-auto">
      <h2 className="text-xl font-bold text-center mb-4">
        השוואת תמהילים
      </h2>
     <table className="w-full table-fixed border-collapse border border-gray-300 text-sm md:text-base">
  <thead className="bg-gray-200 sticky top-0 z-10">
    <tr>
      <th className="border p-2 w-1/4">שדה</th>
      <th className="border p-2 w-1/4">{activeMix.mix_name}</th>
      <th className="border p-2 w-1/4">{compareMix?.mix_name || "-"}</th>
      <th className="border p-2 w-1/4">הפרש</th>
    </tr>
  </thead>
  <tbody>
    {rows.map((row) => {
      const activeValue = activeTotals[row.field as keyof CombinedTotals] || 0;
      const compareValue = compareTotals ? compareTotals[row.field as keyof CombinedTotals] || 0 : 0;
      const diff = activeValue - compareValue;

      return (
        <tr key={row.field} className="hover:bg-gray-100">
          <td className="border p-2 w-1/4 font-semibold">{row.label}</td>
          <td className="border p-2 w-1/4">{formatCurrency(activeValue)}</td>
          <td className="border p-2 w-1/4">{compareTotals ? formatCurrency(compareValue) : "-"}</td>
          <td className="border p-2 w-1/4">{compareTotals ? formatCurrency(diff) : "-"}</td>
        </tr>
      );
    })}
  </tbody>
</table>

    </div>
  );
};

export default MixComparisonTable;
