"use client";

import { useState } from "react";
import { LoanPath } from "@/app/data/hooks/useLoanPaths";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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
        loan_end_date: null,
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
    return (loan.amount * (r * Math.pow(1 + r, loan.months))) / (Math.pow(1 + r, loan.months) - 1);
  };

  // --- robust parser: handles "YYYY-MM-DD", full ISO "YYYY-MM-DDTHH:..", Date, and DD/MM/YYYY
  const parseISODate = (value?: string | Date | null): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    const s = String(value);
    // take date part before 'T' if present
    const datePart = s.split("T")[0];
    // support both "-" and "/" separators
    const sep = datePart.includes("-") ? "-" : "/";
    const parts = datePart.split(sep);
    if (parts.length === 3) {
      // detect if format is YYYY-MM-DD or DD/MM/YYYY
      if (parts[0].length === 4) {
        const [y, m, d] = parts.map(Number);
        if ([y, m, d].some(Number.isNaN)) return null;
        return new Date(y, m - 1, d);
      } else if (parts[2].length === 4) {
        // assume DD/MM/YYYY
        const [d, m, y] = parts.map(Number);
        if ([y, m, d].some(Number.isNaN)) return null;
        return new Date(y, m - 1, d);
      }
    }
    // fallback to Date constructor
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? null : dt;
  };

  // helper: format local date as YYYY-MM-DD (avoids timezone shift of toISOString)
  const toLocalIsoDate = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  return (
    <div className="overflow-x-auto">
      <button
        onClick={addLoan}
        className="mb-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
      >
        + הוסף הלוואה
      </button>

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
            const parsedDate = parseISODate(loan.loan_end_date ?? loan.end_date ?? null);
            // debug — אפשר להסיר אחר כך
            // eslint-disable-next-line no-console
            console.debug(`[LoanTable] idx=${idx} raw=`, loan.loan_end_date, "parsed=", parsedDate);

            return (
              <tr key={loan.id} className="hover:bg-gray-100">
                <td className="border p-1">
                  <input
                    type="text"
                    value={Number.isFinite(loan.amount) ? loan.amount.toLocaleString("he-IL") : ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, "");
                      updateLoan(idx, "amount", Number(raw) || 0);
                    }}
                    className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400 text-right"
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
                        {p.name}
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
                    value={loan.anchor_margin ?? 0}
                    onChange={(e) => updateLoan(idx, "anchor_margin", Number(e.target.value))}
                    className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </td>

                <td className="border p-1">
                  <DatePicker
                    selected={parsedDate ?? null} // null אם אין תאריך
                    onChange={(date: Date | null) => {
                      if (date) {
                        const iso = toLocalIsoDate(date); // YYYY-MM-DD
                        updateLoan(idx, "loan_end_date", iso);
                      } else {
                        updateLoan(idx, "loan_end_date", null);
                      }
                    }}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="בחר תאריך"
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400 text-center"
                  />
                </td>




                <td className="border p-1">
                  <input
                    type="number"
                    value={loan.months ?? 0}
                    onChange={(e) => updateLoan(idx, "months", Number(e.target.value))}
                    className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </td>

                <td className="border p-1">
                  <input
                    type="number"
                    value={loan.rate}
                    onChange={(e) => updateLoan(idx, "rate", Number(e.target.value))}
                    className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </td>

                <td className="border p-1">
                  {calculateMonthly(loan).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>

                <td className="border p-1 text-center">
                  <button onClick={() => deleteLoan(idx)} className="text-red-600 hover:text-red-800 font-bold">
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>

        <tfoot className="bg-gray-100 font-bold">
          <tr>
            <td className="border p-2 text-right" colSpan={8}>
              סה״כ
            </td>
            <td className="border p-2 text-right">
              {loans
                .reduce((sum, loan) => sum + (Number(loan.amount) || 0), 0)
                .toLocaleString("he-IL")}
            </td>
            <td className="border p-2 text-right">
              {loans
                .reduce((sum, loan) => sum + calculateMonthly(loan), 0)
                .toLocaleString("he-IL", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
            </td>
          </tr>
        </tfoot>










      </table>

{/* Debug info (לשדות מוסתרים) */}
       {loans.map((loan) => (
        <div key={loan.id} className="text-red-600 text-xs mt-1 p-1 border  ">
          mix_id: {loan.mix_id} | path_id: {loan.path_id} | anchor_interval: {loan.anchor_interval} | end_date: {loan.end_date} | number: {loan.number} | created_at: {loan.created_at}
        </div>
      ))}







    </div>
  );
}








// "use client"

// import { useState } from "react";

// import { LoanPath } from "@/app/data/hooks/useLoanPaths";
// import DatePicker from "react-datepicker";
// import "react-datepicker/dist/react-datepicker.css";

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

//   const calculateMonthly = (loan: Loan) => {
//     if (!loan.months || loan.months === 0) return 0;
//     const r = loan.rate / 12 / 100;
//     if (r === 0) return loan.amount / loan.months;
//     return loan.amount * (r * Math.pow(1 + r, loan.months)) / (Math.pow(1 + r, loan.months) - 1);
//   };

// const parseISODate = (dateString: string): Date | null => {
//   if (!dateString) return null;
//   const [year, month, day] = dateString.split("-").map(Number);
//   return new Date(year, month - 1, day);
// };


//   return (
//     <div className="overflow-x-auto">
//       <button
//         onClick={addLoan}
//         className="mb-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
//       >
//         + הוסף הלוואה
//       </button>
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
//             <th className="border p-2">ריבית %</th>
//             <th className="border p-2">סכום חודשי</th>
//             <th className="border p-2">מחיקה</th>
//           </tr>
//         </thead>
//         <tbody>
//           {loans.map((loan, idx) => {
//             const path = paths.find((p) => p.id === loan.path_id);
//             return (
//               <tr key={loan.id} className="hover:bg-gray-100">
//                <td className="border p-1">
//                 <input
//                   type="text"
//                   value={loan.amount.toLocaleString("he-IL")}
//                   onChange={(e) => {
//                     מסיר פסיקים ורווחים מהקלט
//                     const raw = e.target.value.replace(/[^\d]/g, "");
//                     updateLoan(idx, "amount", Number(raw) || 0);
//                   }}
//                   className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400 text-right"
//                 />
//               </td>

//                 <td className="border p-1">
//                   <select
//                     value={loan.path_id}
//                     onChange={(e) => updateLoan(idx, "path_id", Number(e.target.value))}
//                     className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
//                   >
//                     {paths.map((p) => (
//                       <option key={p.id} value={p.id}>
//                         {p.name} 
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
//                   <DatePicker
//                       selected={loan.loan_end_date ? parseISODate(loan.loan_end_date) : null}
//                       onChange={(date: Date | null) => {
//                         if (date) {
//                           const iso = date.toISOString().split("T")[0]; // שמירה ל־DB
//                           updateLoan(idx, "loan_end_date", iso);

//                           חישוב חודשים
//                           const now = new Date();
//                           const diffTime = date.getTime() - now.getTime();
//                           const months = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * (365.25 / 12)));
//                           updateLoan(idx, "months", months > 0 ? months : 0);
//                         } else {
//                           updateLoan(idx, "loan_end_date", null);
//                           updateLoan(idx, "months", 0);
//                         }
//                       }}
//                       dateFormat="dd/MM/yyyy"
//                       placeholderText="dd/mm/yyyy"
//                       showMonthDropdown
//                       showYearDropdown
//                       dropdownMode="select"
//                       className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400 text-center"
//                     />

//                 </td>



//                 <td className="border p-1">
//                   <input
//                     type="number"
//                     value={loan.months}
//                     onChange={(e) => updateLoan(idx, "months", Number(e.target.value))}
//                     className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
//                   />
//                 </td>
//                 {/* השדה החדש: ריבית */}
//                 <td className="border p-1">
//                   <input
//                     type="number"
//                     value={loan.rate}
//                     onChange={(e) => updateLoan(idx, "rate", Number(e.target.value))}
//                     className="w-full px-1 py-0.5 border rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
//                   />
//                 </td>
//                 <td className="border p-1">
//                   {calculateMonthly(loan).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
//                 </td>
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

     

//       {/* Debug info (לשדות מוסתרים) */}
//       {loans.map((loan) => (
//         <div key={loan.id} className="text-red-600 text-xs mt-1 p-1 border hidden ">
//           mix_id: {loan.mix_id} | path_id: {loan.path_id} | anchor_interval: {loan.anchor_interval} | end_date: {loan.end_date} | number: {loan.number} | created_at: {loan.created_at}
//         </div>
//       ))}
//     </div>
//   );
// }





