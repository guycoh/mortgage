"use client";

import React from "react";
import { LoanPath } from "@/app/data/hooks/useLoanPaths";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import LoanAmortization from "./LoanAmortization";
import { useState } from "react";

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
  repayment_type?: "שפיצר" | "קרן שווה"; // ✨ חדש
};

type Props = {
  loans: Loan[];
  paths: LoanPath[];
  onChange: (loans: Loan[]) => void;
  annualInflation: number;
  setAnnualInflation: (val: number) => void;
};

export default function LoanTable({
  loans,
  paths,
  onChange,
  annualInflation,
  setAnnualInflation,
}: Props) {
  const updateLoan = (idx: number, key: keyof Loan, value: any) => {
    const updated = [...loans];
    updated[idx] = { ...updated[idx], [key]: value };
    onChange(updated);
  };

const [isAmortizationOpen, setIsAmortizationOpen] = React.useState(false)
const [activeLoan, setActiveLoan] = React.useState<Loan | null>(null);

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
        repayment_type: "שפיצר", // ✨ ברירת מחדל
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
    return (
      (loan.amount * (r * Math.pow(1 + r, loan.months))) /
      (Math.pow(1 + r, loan.months) - 1)
    );
  };

  const parseISODate = (value?: string | Date | null): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    const s = String(value);
    const datePart = s.split("T")[0];
    const sep = datePart.includes("-") ? "-" : "/";
    const parts = datePart.split(sep);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        const [y, m, d] = parts.map(Number);
        if ([y, m, d].some(Number.isNaN)) return null;
        return new Date(y, m - 1, d);
      } else if (parts[2].length === 4) {
        const [d, m, y] = parts.map(Number);
        if ([y, m, d].some(Number.isNaN)) return null;
        return new Date(y, m - 1, d);
      }
    }
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const toLocalIsoDate = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}`;

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
          <tr><th className="border p-2">סכום הלוואה</th>
            <th className="border p-2">סוג סילוקין</th>
            <th className="border p-2">מסלול</th>
            <th className="border p-2">תדירות שינוי</th>
            <th className="border p-2">עוגן</th>
            <th className="border p-2">מרווח מהעוגן</th>
            <th className="border p-2">תאריך סיום</th>
            <th className="border p-2">חודשים</th>
            <th className="border p-2">ריבית %</th>
            <th className="border p-2">סכום חודשי</th>
            <th className="border p-2">פעולות</th> 
          </tr>
        </thead>
        <tbody>
          {loans.map((loan, idx) => {
            const parsedDate = parseISODate(
              loan.loan_end_date ?? loan.end_date ?? null
            );
            const monthlyInflation =
              Math.pow(1 + annualInflation / 100, 1 / 12) - 1;

            // 👇 כאן מותר לך לגשת ל-loan
              const path = paths.find((p) => p.id === loan.path_id);
              const isIndexed = path?.is_indexed ?? false;


            return (
              <React.Fragment key={loan.id}>
                <tr className="hover:bg-gray-100">
                  {/* סכום הלוואה */}
                  <td className="border p-1">
                    <input
                      type="text"
                      value={
                        Number.isFinite(loan.amount)
                          ? loan.amount.toLocaleString("he-IL")
                          : ""
                      }
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, "");
                        updateLoan(idx, "amount", Number(raw) || 0);
                      }}
                      className="w-full px-1 py-0.5 border rounded focus:ring-2 focus:ring-purple-400 text-right"
                    />
                  </td>

                  {/* סוג סילוקין */}
                  <td className="border p-1">
                    <select
                      value={loan.repayment_type || "שפיצר"}
                      onChange={(e) =>
                        updateLoan(
                          idx,
                          "repayment_type",
                          e.target.value as "שפיצר" | "קרן שווה"
                        )
                      }
                      className="w-full px-1 py-0.5 border rounded focus:ring-2 focus:ring-purple-400"
                    >
                      <option value="שפיצר">שפיצר</option>
                      <option value="קרן שווה">קרן שווה</option>
                    </select>
                  </td>

                  {/* מסלול */}
                  <td className="border p-1">
                    <select
                      value={loan.path_id}
                      onChange={(e) =>
                        updateLoan(idx, "path_id", Number(e.target.value))
                      }
                      className="w-full px-1 py-0.5 border rounded focus:ring-2 focus:ring-purple-400"
                    >
                      {paths.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* תדירות שינוי */}
                  <td className="border p-1 w-[60px]">
                    <input
                      type="text"
                      maxLength={3}
                      value={loan.change_frequency || ""}
                      onChange={(e) =>
                        updateLoan(idx, "change_frequency", e.target.value)
                      }
                      className="w-full px-1 py-0.5 border rounded focus:ring-2 focus:ring-purple-400 text-center"
                    />
                  </td>

                  {/* עוגן */}
                  <td className="border p-1 w-[60px]">
                    <input
                      type="text"
                      maxLength={3}
                      value={loan.anchor || ""}
                      onChange={(e) => updateLoan(idx, "anchor", e.target.value)}
                      className="w-full px-1 py-0.5 border rounded focus:ring-2 focus:ring-purple-400 text-center"
                    />
                  </td>

                  {/* מרווח מהעוגן */}
                  <td className="border p-1 w-[60px]">
                    <input
                      type="number"
                      maxLength={3}
                      value={loan.anchor_margin ?? 0}
                      onChange={(e) =>
                        updateLoan(idx, "anchor_margin", Number(e.target.value))
                      }
                      className="w-full px-1 py-0.5 border rounded focus:ring-2 focus:ring-purple-400 text-center"
                    />
                  </td>

                  {/* תאריך סיום */}
                  <td className="border p-1">
                    <DatePicker
                      selected={parsedDate ?? null}
                      onChange={(date: Date | null) => {
                        if (date) {
                          const iso = toLocalIsoDate(date);
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
                      className="w-full px-1 py-0.5 border rounded text-center focus:ring-2 focus:ring-purple-400"
                    />
                  </td>

                  {/* חודשים */}
                  <td className="border p-1 w-[60px]">
                    <input
                      type="number"
                      maxLength={3}
                      value={loan.months ?? 0}
                      onChange={(e) =>
                        updateLoan(idx, "months", Number(e.target.value))
                      }
                      className="w-full px-1 py-0.5 border rounded text-center focus:ring-2 focus:ring-purple-400"
                    />
                  </td>

                  {/* ריבית */}
                  <td className="border p-1 w-[70px]">
                    <input
                      type="number"
                      maxLength={4}
                      value={loan.rate}
                      onChange={(e) =>
                        updateLoan(idx, "rate", Number(e.target.value))
                      }
                      className="w-full px-1 py-0.5 border rounded text-center focus:ring-2 focus:ring-purple-400"
                    />
                  </td>

                  {/* סכום חודשי */}
                  <td className="border p-1 text-right">
                    {calculateMonthly(loan).toLocaleString("he-IL", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>

                  {/* פעולות */}
                  <td className="border p-1 text-center space-x-1">
                    <button
                     onClick={() => {
                        setActiveLoan(loan);   // ✅ שמירת ההלוואה שנבחרה
                        setIsAmortizationOpen(true); // ✅ פתיחת מודאל
                      }}
                      className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                    >
                      לוח סילוקין
                    </button>
                    <button
                      onClick={() => deleteLoan(idx)}
                      className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                    >
                      מחיקה
                    </button>
                  </td>
                </tr>                
                <tr className="hidden"  >
                  <td colSpan={10} className="border p-2">
                    <div className="flex flex-col gap-1 text-xs">
                      {/* אינפלציה */}
                      <div className="text-red-600">
                        <p className="m-0">
                          אינפלציה צפויה (שנתית): {annualInflation.toFixed(2)}%
                        </p>
                        <p className="m-0">
                          אינפלציה חודשית: {(monthlyInflation * 100).toFixed(3)}%
                        </p>
                       
                       <p className="m-0">
                          צמוד מדד: {isIndexed ? "true" : "false"}
                       </p>
                                
                        <p className="m-0">mix_id: {loan.mix_id}</p>
                        <p className="m-0">path_id: {loan.path_id}</p>
                      </div>
                    </div>


                  </td>





                </tr>

              </React.Fragment>
            );
          })}

        </tbody>

        <tfoot className="bg-gray-100 font-bold">
          <tr>
            <td className="border p-2 text-right">
              {loans
                .reduce((sum, loan) => sum + (Number(loan.amount) || 0), 0)
                .toLocaleString("he-IL")}
            </td>
            <td className="border p-2"></td>
            <td className="border p-2"></td>
            <td className="border p-2"></td>
            <td className="border p-2"></td>
            <td className="border p-2"></td>
            <td className="border p-2"></td>
            <td className="border p-2"></td>
            <td className="border p-2"></td>
            <td className="border p-2 text-right">
              {loans
                .reduce((sum, loan) => sum + calculateMonthly(loan), 0)
                .toLocaleString("he-IL", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
            </td>
            <td className="border p-2"></td>
          </tr>
        </tfoot>
      </table>


{/* 👇 מחוץ ל־map אבל בתוך LoanTable */}
<LoanAmortization
  isOpen={isAmortizationOpen}
  onClose={() => setIsAmortizationOpen(false)}
  loan={activeLoan}
  path={paths.find((p) => p.id === activeLoan?.path_id)}
  annualInflation={annualInflation}            
  isIndexed={paths.find((p) => p.id === activeLoan?.path_id)?.is_indexed ?? false}
  monthlyPayment={activeLoan ? calculateMonthly(activeLoan) : 0} // ✨ שולח את החישוב
/>

    </div>
  );
}




















