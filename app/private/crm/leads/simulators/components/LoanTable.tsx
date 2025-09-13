"use client";

import { useState } from "react";

import { LoanPath } from "@/app/data/hooks/useLoanPaths";

export type Loan = {
  id: string;
  mix_id: string;
  path_id: number;
  amount: number;
  rate: number;
  months: number;
  loan_end_date?: string | null;
  anchor?: string | null;
  anchor_margin?: number | null;
  change_frequency?: string | null;
  number?: number;
  created_at?: string;
  anchor_interval?: string | null;
  end_date?: string | null;
};

type Props = {
  loans: Loan[];
  paths: LoanPath[];
  onChange: (loans: Loan[]) => void;
};

export default function LoanTable({ loans, paths, onChange }: Props) {
  const updateLoan = (idx: number, key: keyof Loan, value: any) => {
    const updated = [...loans];
    updated[idx] = { ...updated[idx], [key]: value };
    onChange(updated);
  };

  const addLoan = () => {
    onChange([
      ...loans,
      {
        id: crypto.randomUUID(),
        mix_id: loans[0]?.mix_id || "",
        path_id: paths[0]?.id || 1,
        amount: 0,
        rate: 0,
        months: 0,
      },
    ]);
  };

  const deleteLoan = (idx: number) => {
    const updated = [...loans];
    updated.splice(idx, 1);
    onChange(updated);
  };

  const calculateMonthly = (loan: Loan) => {
    if (!loan.months || loan.months === 0) return 0;
    const r = loan.rate / 12 / 100;
    if (r === 0) return loan.amount / loan.months;
    return loan.amount * (r * Math.pow(1 + r, loan.months)) / (Math.pow(1 + r, loan.months) - 1);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-300 text-sm">
        <thead className="bg-gray-200">
          <tr>
            <th className="border p-2">סכום הלוואה</th>
            <th className="border p-2">מסלול</th>
            <th className="border p-2">תדירות שינוי</th>
            <th className="border p-2">עוגן</th>
            <th className="border p-2">מרווח מהעוגן</th>
            <th className="border p-2">תאריך סיום</th>
            <th className="border p-2">חודשים</th>
            <th className="border p-2">ריבית %</th>
            <th className="border p-2">סכום חודשי</th>
            <th className="border p-2">מחיקה</th>
          </tr>
        </thead>
        <tbody>
          {loans.map((loan, idx) => {
            const path = paths.find((p) => p.id === loan.path_id);
            return (
              <tr key={loan.id} className="hover:bg-gray-100">
                <td className="border p-1">
                  <input
                    type="number"
                    value={loan.amount}
                    onChange={(e) => updateLoan(idx, "amount", Number(e.target.value))}
                    className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </td>
                <td className="border p-1">
                  <select
                    value={loan.path_id}
                    onChange={(e) => updateLoan(idx, "path_id", Number(e.target.value))}
                    className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    {paths.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.is_indexed ? "(צמוד)" : ""}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border p-1">
                  <input
                    type="text"
                    value={loan.change_frequency || ""}
                    onChange={(e) => updateLoan(idx, "change_frequency", e.target.value)}
                    className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </td>
                <td className="border p-1">
                  <input
                    type="text"
                    value={loan.anchor || ""}
                    onChange={(e) => updateLoan(idx, "anchor", e.target.value)}
                    className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </td>
                <td className="border p-1">
                  <input
                    type="number"
                    value={loan.anchor_margin || 0}
                    onChange={(e) => updateLoan(idx, "anchor_margin", Number(e.target.value))}
                    className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </td>
                <td className="border p-1">
                  <input
                    type="date"
                    value={loan.loan_end_date || ""}
                    onChange={(e) => updateLoan(idx, "loan_end_date", e.target.value)}
                    className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </td>
                <td className="border p-1">
                  <input
                    type="number"
                    value={loan.months}
                    onChange={(e) => updateLoan(idx, "months", Number(e.target.value))}
                    className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </td>
                {/* השדה החדש: ריבית */}
                <td className="border p-1">
                  <input
                    type="number"
                    value={loan.rate}
                    onChange={(e) => updateLoan(idx, "rate", Number(e.target.value))}
                    className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </td>
                <td className="border p-1">{calculateMonthly(loan).toFixed(2)}</td>
                <td className="border p-1 text-center">
                  <button
                    onClick={() => deleteLoan(idx)}
                    className="text-red-600 hover:text-red-800 font-bold"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <button
        onClick={addLoan}
        className="mt-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
      >
        + הוסף הלוואה
      </button>

      {/* Debug info (לשדות מוסתרים) */}
      {loans.map((loan) => (
        <div key={loan.id} className="text-red-600 text-xs mt-1 p-1 border">
          mix_id: {loan.mix_id} | path_id: {loan.path_id} | anchor_interval: {loan.anchor_interval} | end_date: {loan.end_date} | number: {loan.number} | created_at: {loan.created_at}
        </div>
      ))}
    </div>
  );
}























// "use client";

// import { useState } from "react";

// import { LoanPath } from "@/app/data/hooks/useLoanPaths";

// export type Loan = {
//   id: string;
//   mix_id: string;
//   path_id: number;
//   amount: number;
//   rate: number;
//   months: number;
//   loan_end_date?: string | null;
//   anchor?: string | null;
//   anchor_margin?: number | null;
//   change_frequency?: string | null;
//   number?: number;
//   created_at?: string;
//   anchor_interval?: string | null;
//   end_date?: string | null;
// };

// type Props = {
//   loans: Loan[];
//   paths: LoanPath[];
//   onChange: (loans: Loan[]) => void;
// };

// export default function LoanTable({ loans, paths, onChange }: Props) {
//   const updateLoan = (idx: number, key: keyof Loan, value: any) => {
//     const updated = [...loans];
//     updated[idx] = { ...updated[idx], [key]: value };
//     onChange(updated);
//   };

//   const addLoan = () => {
//     onChange([
//       ...loans,
//       {
//         id: crypto.randomUUID(),
//         mix_id: loans[0]?.mix_id || "",
//         path_id: paths[0]?.id || 1,
//         amount: 0,
//         rate: 0,
//         months: 0,
//       },
//     ]);
//   };

//   const deleteLoan = (idx: number) => {
//     const updated = [...loans];
//     updated.splice(idx, 1);
//     onChange(updated);
//   };

//   // חישוב תשלום חודשי לפי סכום, ריבית חודשית ומספר חודשים
//   const calculateMonthly = (loan: Loan) => {
//     if (!loan.months || loan.months === 0) return 0;
//     const r = loan.rate / 12 / 100; // ריבית חודשית
//     if (r === 0) return loan.amount / loan.months;
//     return loan.amount * (r * Math.pow(1 + r, loan.months)) / (Math.pow(1 + r, loan.months) - 1);
//   };

//   return (
//     <div className="overflow-x-auto">
//       <table className="w-full border-collapse border border-gray-300 text-sm">
//         <thead className="bg-gray-200">
//           <tr>
//             <th className="border p-2">סכום הלוואה</th>
//             <th className="border p-2">מסלול</th>
//             <th className="border p-2">תדירות שינוי</th>
//             <th className="border p-2">עוגן</th>
//             <th className="border p-2">מרווח מהעוגן</th>
//             <th className="border p-2">תאריך סיום</th>
//             <th className="border p-2">חודשים</th>
//             <th className="border p-2">סכום חודשי</th>
//             <th className="border p-2">מחיקה</th>
//           </tr>
//         </thead>
//         <tbody>
//           {loans.map((loan, idx) => {
//             const path = paths.find((p) => p.id === loan.path_id);
//             return (
//               <tr key={loan.id} className="hover:bg-gray-100">
//                 <td className="border p-1">
//                   <input
//                     type="number"
//                     value={loan.amount}
//                     onChange={(e) => updateLoan(idx, "amount", Number(e.target.value))}
//                     className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
//                   />
//                 </td>
//                 <td className="border p-1">
//                   <select
//                     value={loan.path_id}
//                     onChange={(e) => updateLoan(idx, "path_id", Number(e.target.value))}
//                     className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
//                   >
//                     {paths.map((p) => (
//                       <option key={p.id} value={p.id}>
//                         {p.name} {p.is_indexed ? "(צמוד)" : ""}
//                       </option>
//                     ))}
//                   </select>
//                 </td>
//                 <td className="border p-1">
//                   <input
//                     type="text"
//                     value={loan.change_frequency || ""}
//                     onChange={(e) => updateLoan(idx, "change_frequency", e.target.value)}
//                     className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
//                   />
//                 </td>
//                 <td className="border p-1">
//                   <input
//                     type="text"
//                     value={loan.anchor || ""}
//                     onChange={(e) => updateLoan(idx, "anchor", e.target.value)}
//                     className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
//                   />
//                 </td>
//                 <td className="border p-1">
//                   <input
//                     type="number"
//                     value={loan.anchor_margin || 0}
//                     onChange={(e) => updateLoan(idx, "anchor_margin", Number(e.target.value))}
//                     className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
//                   />
//                 </td>
//                 <td className="border p-1">
//                   <input
//                     type="date"
//                     value={loan.loan_end_date || ""}
//                     onChange={(e) => updateLoan(idx, "loan_end_date", e.target.value)}
//                     className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
//                   />
//                 </td>
//                 <td className="border p-1">
//                   <input
//                     type="number"
//                     value={loan.months}
//                     onChange={(e) => updateLoan(idx, "months", Number(e.target.value))}
//                     className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
//                   />
//                 </td>
//                 <td className="border p-1">{calculateMonthly(loan).toFixed(2)}</td>
//                 <td className="border p-1 text-center">
//                   <button
//                     onClick={() => deleteLoan(idx)}
//                     className="text-red-600 hover:text-red-800 font-bold"
//                   >
//                     ✕
//                   </button>
//                 </td>
//               </tr>
//             );
//           })}
//         </tbody>
//       </table>

//       <button
//         onClick={addLoan}
//         className="mt-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
//       >
//         + הוסף הלוואה
//       </button>

//       {/* Debug info (לשדות מוסתרים) */}
//       {loans.map((loan) => (
//         <div key={loan.id} className="text-red-600 text-xs mt-1 p-1 border">
//           mix_id: {loan.mix_id} | path_id: {loan.path_id} | anchor_interval: {loan.anchor_interval} | end_date: {loan.end_date} | number: {loan.number} | created_at: {loan.created_at}
//         </div>
//       ))}
//     </div>
//   );
// }













