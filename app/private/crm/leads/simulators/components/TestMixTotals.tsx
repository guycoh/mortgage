// TestMixTotals.tsx

"use client";

//import { Loan } from "./calculate/loanCalculators";



import { calculateMixTotals } from "./calculate/mixCalculators";
import { calculateLoan, Loan } from "./calculate/loanCalculators";

interface Mix {
  id: string;
  mix_name: string;
  loans?: Loan[];
}

interface TestMixTotalsProps {
  mixes: Mix[];
  activeMixId: string | null;
  isIndexed?: boolean;
  annualInflation?: number;
}

export default function TestMixTotals({
  mixes,
  activeMixId,
  isIndexed = false,
  annualInflation = 0,
}: TestMixTotalsProps) {
  if (!activeMixId) return <p>לא נבחר תמהיל</p>;

  const mix = mixes.find((m) => m.id === activeMixId);
  if (!mix) return <p>תמהיל לא נמצא</p>;

  // חישוב סיכום תמהיל
  const totals = calculateMixTotals(
    mix.loans || [],
    isIndexed,
    annualInflation,
    mix.id
  );

  return (
    <div className="p-4 border rounded-lg shadow bg-gray-50 mt-4 space-y-6">
      <h2 className="text-lg font-bold text-gray-900">
        TestMixTotals – הצגת תמהיל והלוואות
      </h2>

      {/* הלוואות */}
      {mix.loans && mix.loans.length > 0 ? (
        mix.loans.map((loan, idx) => {
        const loanTotals = calculateLoan(
          loan,
          isIndexed,
          annualInflation
        );

          return (
            <div
              key={loan.id || idx}
              className="p-4 rounded-lg bg-blue-50 border border-blue-200 shadow-sm"
            >
              <h3 className="font-semibold text-blue-800 mb-2">
                הלוואה {idx + 1} – {loanTotals.amortization_schedule_id}
              </h3>
              <ul className="space-y-1 text-sm text-blue-900">
                <li>
                  <span className="font-medium">amortization_schedule_id:</span>{" "}
                  {loanTotals.amortization_schedule_id}
                </li>
                <li>
                  <span className="font-medium">monthlyPayment:</span>{" "}
                  {loanTotals.monthlyPayment.toLocaleString("he-IL")}
                </li>
                <li>
                  <span className="font-medium">maxMonthlyPayment:</span>{" "}
                  {loanTotals.maxMonthlyPayment.toLocaleString("he-IL")}
                </li>
                <li>
                  <span className="font-medium">totalInterest:</span>{" "}
                  {loanTotals.totalInterest.toLocaleString("he-IL")}
                </li>
                <li>
                  <span className="font-medium">totalPaid:</span>{" "}
                  {loanTotals.totalPaid.toLocaleString("he-IL")}
                </li>
                <li>
                  <span className="font-medium">isIndexed:</span>{" "}
                  {loanTotals.isIndexed ? "כן" : "לא"}
                </li>
                <li>
                  <span className="font-medium">schedule:</span>{" "}
                  {loanTotals.schedule.length} שורות
                </li>
              </ul>
            </div>
          );
        })
      ) : (
        <p className="text-gray-500">אין הלוואות בתמהיל זה</p>
      )}

      {/* סיכום תמהיל */}
      <div className="p-4 rounded-lg bg-green-50 border border-green-200 shadow-sm">
        <h3 className="font-semibold text-green-800 mb-2">סיכום תמהיל</h3>
        <ul className="space-y-1 text-sm text-green-900">
          <li>
            <span className="font-medium">mix_id:</span> {totals.mix_id}
          </li>
          <li>
            <span className="font-medium">mixTotalAmount:</span>{" "}
            {totals.mixTotalAmount.toLocaleString("he-IL")}
          </li>
          <li>
            <span className="font-medium">mixTotalPrincipal:</span>{" "}
            {totals.mixTotalPrincipal.toLocaleString("he-IL")}
          </li>
          <li>
            <span className="font-medium">mixTotalInterest:</span>{" "}
            {totals.mixTotalInterest.toLocaleString("he-IL")}
          </li>
          <li>
            <span className="font-medium">mixTotalPaid:</span>{" "}
            {totals.mixTotalPaid.toLocaleString("he-IL")}
          </li>
          <li>
            <span className="font-medium">mixTotalMonthlyPayment:</span>{" "}
            {totals.mixTotalMonthlyPayment.toLocaleString("he-IL")}
          </li>
          <li>
            <span className="font-medium">mixPeakMonthlyPayment:</span>{" "}
            {totals.mixPeakMonthlyPayment.toLocaleString("he-IL")}
          </li>
        </ul>
      </div>

    </div>
  );
}











// TestMixTotals.tsx
// "use client";

// import React, { useMemo } from "react";
// import { MixTotals, calculateMixTotals } from "./calculate/mixCalculators";
// import { Loan } from "./calculate/loanCalculators";

// interface Mix {
//   id: string;
//   mix_name: string;
//   loans?: Loan[];
// }

// interface TestMixTotalsProps {
//   mixes: Mix[];
//   activeMixId: string | null;
//   isIndexed?: boolean;
//   annualInflation?: number;
// }

// export default function TestMixTotals({
//   mixes,
//   activeMixId,
//   isIndexed = true,
//   annualInflation = 2.8,
// }: TestMixTotalsProps) {
//   if (!activeMixId) return <p>לא נבחר תמהיל פעיל</p>;

//   const activeMix = useMemo(
//     () => mixes.find((m) => m.id === activeMixId),
//     [mixes, activeMixId]
//   );

//   if (!activeMix) return <p>לא נמצא התמהיל</p>;

//   const totals: MixTotals = useMemo(
//     () => calculateMixTotals(activeMix.loans || [], isIndexed, annualInflation, activeMix.id),
//     [activeMix, isIndexed, annualInflation]
//   );

//   return (
//     <div className="p-4 border rounded shadow bg-white max-w-md mx-auto mt-4">
//       <h2 className="text-lg font-bold mb-4 text-center">נתוני תמהיל</h2>
//       <table className="w-full text-sm">
//         <tbody>
//           <tr>
//             <td className="font-medium pr-2">mix_id:</td>
//             <td>{totals.mix_id}</td>
//           </tr>
//           <tr>
//             <td className="font-medium pr-2">totalAmount (סך ההלוואות):</td>
//             <td>{totals.totalAmount.toLocaleString("he-IL")}</td>
//           </tr>
//           <tr>
//             <td className="font-medium pr-2">totalPrincipal (סך קרן):</td>
//             <td>{totals.totalPrincipal.toLocaleString("he-IL")}</td>
//           </tr>
//           <tr>
//             <td className="font-medium pr-2">totalInterest (סך ריבית):</td>
//             <td>{totals.totalInterest.toLocaleString("he-IL")}</td>
//           </tr>
//           <tr>
//             <td className="font-medium pr-2">totalPaid (סך תשלומים):</td>
//             <td>{totals.totalPaid.toLocaleString("he-IL")}</td>
//           </tr>
//           <tr>
//             <td className="font-medium pr-2">totalMonthlyPayment (תשלום חודשי ממוצע):</td>
//             <td>{totals.totalMonthlyPayment.toLocaleString("he-IL")}</td>
//           </tr>
//           <tr>
//             <td className="font-medium pr-2">peakMonthlyPayment (תשלום חודשי בשיא):</td>
//             <td>{totals.peakMonthlyPayment.toLocaleString("he-IL")}</td>
//           </tr>
//         </tbody>
//       </table>
//     </div>
//   );
// }
