// MixComparisonTable.tsx
"use client";

import React from "react";
import { calculateMixFullTotals, MixFullTotals } from "./calculate/mixScheduleCalculators";
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

// 🔹 נגדיר טיפוס חדש – רק לשדות מספריים
type NumericMixField = Exclude<keyof MixFullTotals, "schedule">;

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

  const activeTotals = calculateMixFullTotals(activeMix.loans, annualInflation);
  const compareTotals = compareMix && compareMix.loans?.length
    ? calculateMixFullTotals(compareMix.loans, annualInflation)
    : null;

  const formatCurrency = (value: number) =>
    value.toLocaleString("he-IL", {
      style: "currency",
      currency: "ILS",
      maximumFractionDigits: 0,
    });

const rows: { label: string; field: keyof MixFullTotals | "costPerShekel" }[] = [
  { label: "סכום המשכנתא", field: "originalLoanAmount" },
  { label: "סך הקרן", field: "totalPrincipal" },
  { label: "סך הריבית", field: "totalInterest" },
  { label: "תשלום ראשון", field: "firstPayment" },
  { label: "תשלום בשיא", field: "maxPayment" },
  { label: "עלות כוללת", field: "totalPayment" },
  { label: "עלות לשקל", field: "costPerShekel" }, // שורה חדשה
];
const formatCostPerShekel = (value: number) => value.toFixed(2);


  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200 overflow-x-auto">
      <h2 className="text-xl font-bold text-center mb-4">השוואת תמהילים</h2>

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
          let activeValue: number;
          let compareValue: number;

          if (row.field === "costPerShekel") {
            activeValue = activeTotals.totalPayment / activeTotals.originalLoanAmount;
            compareValue = compareTotals
              ? compareTotals.totalPayment / compareTotals.originalLoanAmount
              : 0;
          } else {
            activeValue = activeTotals[row.field as keyof MixFullTotals] as number;
            compareValue = compareTotals
              ? (compareTotals[row.field as keyof MixFullTotals] as number)
              : 0;
          }

          const diff = activeValue - compareValue;

          const diffClass =
            diff > 0
              ? "text-green-600 font-semibold"
              : diff < 0
              ? "text-red-600 font-semibold"
              : "text-gray-700";

          return (
            <tr key={row.field} className="hover:bg-gray-100 transition">
              <td className="border p-2 w-1/4 font-semibold">{row.label}</td>
              <td className="border p-2 w-1/4">
                {row.field === "costPerShekel"
                  ? formatCostPerShekel(activeValue)
                  : formatCurrency(activeValue)}
              </td>
              <td className="border p-2 w-1/4">
                {compareTotals
                  ? row.field === "costPerShekel"
                    ? formatCostPerShekel(compareValue)
                    : formatCurrency(compareValue)
                  : "-"}
              </td>
              <td className={`border p-2 w-1/4 ${diffClass}`}>
                {compareTotals
                  ? row.field === "costPerShekel"
                    ? formatCostPerShekel(diff)
                    : formatCurrency(diff)
                  : "-"}
              </td>
            </tr>
          );
        })}
      </tbody>


      </table>
    </div>
  );
};

export default MixComparisonTable;











// "use client"

// import React from "react";
// import { calculateUnifiedSchedule, calculateUnifiedTotals, CombinedTotals } from "./calculate/mixScheduleCalculators";
// import { Loan } from "./calculate/loanCalculators";

// interface Mix {
//   id: string;
//   mix_name: string;
//   loans?: Loan[];
// }

// interface MixComparisonTableProps {
//   activeMixId: string | null;
//   compareMixId: string | null;
//   mixes: Mix[];
//   annualInflation?: number;
// }

// const MixComparisonTable: React.FC<MixComparisonTableProps> = ({
//   activeMixId,
//   compareMixId,
//   mixes,
//   annualInflation = 0,
// }) => {
//   if (!activeMixId) return <p>אנא בחר תמהיל להצגה.</p>;

//   const activeMix = mixes.find((m) => m.id === activeMixId);
//   const compareMix = compareMixId ? mixes.find((m) => m.id === compareMixId) : null;

//   if (!activeMix || !activeMix.loans?.length)
//     return <p>אין נתונים להצגה עבור התמהיל הנוכחי.</p>;

//   const activeSchedule = calculateUnifiedSchedule(activeMix.loans, annualInflation);
//   const activeTotals = calculateUnifiedTotals(activeSchedule);

//   let compareTotals: CombinedTotals | null = null;
//   if (compareMix && compareMix.loans?.length) {
//     const compareSchedule = calculateUnifiedSchedule(compareMix.loans, annualInflation);
//     compareTotals = calculateUnifiedTotals(compareSchedule);
//   }

//   const formatCurrency = (value: number) =>
//     value.toLocaleString("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 });

//   const rows = [
//     { label: "סך הכל תשלום", field: "mixTotalPayment" },
//     { label: "סך הקרן", field: "mixTotalPrincipal" },
//     { label: "סך הריבית", field: "mixTotalInterest" },
//     { label: "יתרת פתיחה", field: "mixOpeningBalance" },
//     { label: "יתרת סגירה", field: "mixClosingBalance" },
//   ];

//   return (
//     <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200 overflow-x-auto">
//       <h2 className="text-xl font-bold text-center mb-4">
//         השוואת תמהילים
//       </h2>
//      <table className="w-full table-fixed border-collapse border border-gray-300 text-sm md:text-base">
//   <thead className="bg-gray-200 sticky top-0 z-10">
//     <tr>
//       <th className="border p-2 w-1/4">שדה</th>
//       <th className="border p-2 w-1/4">{activeMix.mix_name}</th>
//       <th className="border p-2 w-1/4">{compareMix?.mix_name || "-"}</th>
//       <th className="border p-2 w-1/4">הפרש</th>
//     </tr>
//   </thead>
//   <tbody>
//   {rows.map((row) => {
//     const activeValue = activeTotals[row.field as keyof CombinedTotals] || 0;
//     const compareValue = compareTotals ? compareTotals[row.field as keyof CombinedTotals] || 0 : 0;
//     const diff = activeValue - compareValue;

//     // 🎨 קובעים צבע לפי חיובי / שלילי
//     const diffClass =
//       diff > 0
//         ? "text-green-600 font-semibold"
//         : diff < 0
//         ? "text-red-600 font-semibold"
//         : "text-gray-700";

//     return (
//       <tr key={row.field} className="hover:bg-gray-100 transition">
//         <td className="border p-2 w-1/4 font-semibold">{row.label}</td>
//         <td className="border p-2 w-1/4">{formatCurrency(activeValue)}</td>
//         <td className="border p-2 w-1/4">
//           {compareTotals ? formatCurrency(compareValue) : "-"}
//         </td>
//         <td className={`border p-2 w-1/4 ${diffClass}`}>
//           {compareTotals ? formatCurrency(diff) : "-"}
//         </td>
//       </tr>
//     );
//   })}
// </tbody>

// </table>

//     </div>
//   );
// };

// export default MixComparisonTable;
