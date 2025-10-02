"use client"

import React from "react";
import { LoanPath } from "@/app/data/hooks/useLoanPaths";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import LoanAmortization from "./LoanAmortization";
import { useState } from "react";

import { schedules } from "@/app/data/amortization_schedules";
import { LoanResult, calculateLoan } from "./calculate/loanCalculators";


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
  amortization_schedule_id: number; // 👈 כאן זה חובה
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
//טסט
const [isAmortizationModalOpen, setIsAmortizationModalOpen] = useState(false);



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
        amortization_schedule_id: schedules[0]?.id || 1, // ✅ ברירת מחדל
      },
    ]);
  };

  const deleteLoan = (idx: number) => {
    const updated = [...loans];
    updated.splice(idx, 1);
    onChange(updated);
  };

  //לבטל
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


      <table className="w-full border-collapse border border-gray-300 text-sm"><thead className="bg-gray-300">
          <tr>
            <th className="border p-2">סכום הלוואה</th>
            <th className="border p-2">לוח סילוקין</th>
            <th className="border p-2">מסלול</th>
            <th className="border p-2">תדירות שינוי</th>
            <th className="border p-2">עוגן</th>
            <th className="border p-2">מרווח מהעוגן</th>

            {/* השדות החדשים */}
            <th className="border p-2 bg-gray-400">גרייס</th>
            <th className="border p-2 bg-gray-400">חודשי גרייס</th>

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
             
            //  פונקציה לחישוב סכומים כוללים לפי לוח סילוקין
     
              const calculateTotalsForLoan = (
                loan: Loan,
                monthlyInflation: number,
                isIndexed: boolean
              ) => {
                const monthlyPayment = calculateMonthly(loan); // סכום חודשי לפי ריבית והלוואה
                let openingBalance = loan.amount; // י.פ
                let totalPrincipal = 0;
                let totalInterest = 0;
                let totalPayment = 0;

                for (let i = 1; i <= loan.months; i++) {
                  const inflationFactor = isIndexed ? Math.pow(1 + monthlyInflation, i) : 1;
                  const actualPayment = monthlyPayment * inflationFactor;
                  const interestPayment = openingBalance * (loan.rate / 12 / 100) * (isIndexed ? 1 + monthlyInflation : 1);
                  const principalPayment = actualPayment - interestPayment;

                  totalPrincipal += principalPayment;
                  totalInterest += interestPayment;
                  totalPayment += actualPayment;

                  // עדכון יתרת סגירה לחודש הבא
                  openingBalance = (openingBalance * (isIndexed ? 1 + monthlyInflation : 1)) - principalPayment;
                }

                return {
                  totalPrincipal,
                  totalInterest,
                  totalPayment,
                };
              };



            return (
              <React.Fragment key={loan.id}>
                <tr className="hover:bg-gray-100">
                  {/* סכום הלוואה */}
                  
                  <td className="border p-1 w-[120px]">
                    <input
                      type="text"
                      value={Number.isFinite(loan.amount) ? loan.amount.toLocaleString("he-IL") : ""}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, "");
                        updateLoan(idx, "amount", Number(raw) || 0);
                      }}
                      className="w-full px-1 py-0.5 border rounded focus:ring-2 focus:ring-purple-400 text-right focus:bg-orange-100"
                    />
                  </td>

                {/* לוח סילוקין */}
                  <td className="border p-1">
                    <select
                      value={loan.amortization_schedule_id}
                      onChange={(e) =>
                        updateLoan(idx, "amortization_schedule_id", Number(e.target.value))
                      }
                      className="w-full px-1 py-0.5 border rounded focus:ring-2 focus:ring-purple-400 focus:bg-orange-100 "
                    >
                      {schedules.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.schedule_name}
                        </option>
                      ))}
                    </select>
                  </td>

                {/* מסלול */}
                  <td className="border p-1">
                    <select
                      value={loan.path_id}
                      onChange={(e) =>
                        updateLoan(idx, "path_id", Number(e.target.value))
                      }
                      className="w-full px-1 py-0.5 border rounded focus:ring-2 focus:ring-purple-400 focus:bg-orange-100"
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
                      className="w-full px-1 py-0.5 border rounded focus:ring-2 focus:ring-purple-400 text-center focus:bg-orange-100 "
                    />
                  </td>

                  {/* עוגן */}
                  <td className="border p-1 w-[60px]">
                    <input
                      type="text"
                      maxLength={3}
                      value={loan.anchor || ""}
                      onChange={(e) => updateLoan(idx, "anchor", e.target.value)}
                      className="w-full px-1 py-0.5 border rounded focus:ring-2 focus:ring-purple-400 text-center focus:bg-orange-100 "
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
                      className="w-full px-1 py-0.5 border rounded focus:ring-2 focus:ring-purple-400 text-center focus:bg-orange-100"
                    />
                  </td>

                  {/* גרייס */}
                  <td className="border p-1 w-[80px] bg-gray-400">
                    <select
                    
                    
                      className="w-full px-1 py-0.5 border rounded focus:ring-2 focus:ring-purple-400 text-center focus:bg-orange-100"
                    >
                      {[
                        { id: 1, grace: 'ללא', labelEn: 'None' },
                        { id: 2, grace: 'חלקי', labelEn: 'Partial' },
                        { id: 3, grace: 'מלא', labelEn: 'Full' },
                      ].map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.grace}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* חודשי גרייס */}
                  <td className="border p-1 w-[60px] bg-gray-400">
                    <input
                      type="number"
                      min={0}
                          className="w-full px-1 py-0.5 border rounded focus:ring-2 focus:ring-purple-400 text-center focus:bg-orange-100 "
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
                      className="w-full px-1 py-0.5 border rounded text-center focus:ring-2 focus:ring-purple-400 before:focus:bg-orange-100 focus:bg-orange-100 "
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
                      className="w-full px-1 py-0.5 border rounded text-center focus:ring-2 focus:ring-purple-400 focus:bg-orange-100"
                    />
                  </td>

                  {/* סכום חודשי */}
                  <td className="border p-1 text-right">
                    {calculateLoan(loan, annualInflation).monthlyPayment.toLocaleString("he-IL", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </td>                              

                  {/* פעולות */}
                  <td className="border p-1 w-[140px]">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => {
                          setActiveLoan(loan);
                          setIsAmortizationOpen(true);
                        }}
                        className="w-[65px] px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                      >
                        לוח
                      </button>
                      <button
                        onClick={() => deleteLoan(idx)}
                        className="w-[65px] px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                      >
                        מחיקה
                      </button>
                    </div>
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

                {/* סיכום הלוואה */}
                <tr className="hidden">
                  <td colSpan={10} className="border p-2 bg-yellow-50 text-xs">
                    {(() => {
                      const totals = calculateTotalsForLoan(loan, monthlyInflation, isIndexed);
                      return (
                        <div className="flex gap-6">
                          <span>סה"כ קרן: {totals.totalPrincipal.toLocaleString("he-IL")}</span>
                          <span>סה"כ ריבית: {totals.totalInterest.toLocaleString("he-IL", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}</span>
                          <span>סה"כ החזר: {totals.totalPayment.toLocaleString("he-IL", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}</span>
                        </div>
                      );
                    })()}
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
            <td className="border p-2"></td>
            <td className="border p-2"></td>
            <td className="border p-2 text-right">
              {loans
                .reduce((sum, loan) => {
                  const result = calculateLoan(loan, annualInflation);
                  return sum + result.monthlyPayment;
                }, 0)
                .toLocaleString("he-IL", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
            </td>

            <td className="border p-2"></td>
          </tr>       
      {/* סיכום הלוואה */}


      
      
        </tfoot>



      </table>

<LoanAmortization
  isOpen={isAmortizationOpen}
  onClose={() => setIsAmortizationOpen(false)}
  loan={activeLoan}
  annualInflation={annualInflation}   // 👈 עכשיו באמת יעבור מהסטייט
/>


    </div>
  );
}













