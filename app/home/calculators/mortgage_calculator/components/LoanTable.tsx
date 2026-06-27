"use client"

import React, { useState } from "react";
import { Trash2, Calendar, Plus } from "lucide-react";
import { LoanPath } from "@/app/data/hooks/useLoanPaths";
import { graceTypes } from "@/app/data/graceTypes";
import DatePicker from "react-datepicker";
import LoanAmortization from "./LoanAmortization";
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
  amortization_schedule_id: number;
  grace_type_id?: number | null; // סוג גרייס (מתוך grace_types)
  grace_months?: number; // ✅ חדש — מספר חודשי גרייס
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

  const [isAmortizationOpen, setIsAmortizationOpen] = useState(false);
  const [activeLoan, setActiveLoan] = useState<Loan | null>(null);

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
        amortization_schedule_id: schedules[0]?.id || 1,
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

  const inputBaseStyle = "w-full bg-gray-50 border border-gray-200 focus:bg-orange-50 focus:border-orange-400 p-1.5 text-center outline-none transition-colors rounded-none";

  return (
    <div className="w-full">
      {/* כפתור הוספת הלוואה מעוצב */}
      <button
        onClick={addLoan}
        className="mb-4 flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition shadow-sm"
      >
        <Plus size={16} />
        הוסף הלוואה
      </button>

      {/* תצוגת דסקטופ: טבלה קלאסית רחבה (מוסתרת בנייד) */}
      <div className="hidden lg:block border border-gray-200 rounded-none overflow-x-auto">
        <table className="w-full text-right border-collapse text-sm rounded-none">
          <thead>
            <tr className="bg-[#1d75a1] text-white font-bold whitespace-nowrap divide-x divide-x-reverse divide-white/10 rounded-none">
              <th className="p-3 text-center">סכום הלוואה</th>
              <th className="p-3 text-center">לוח סילוקין</th>
              <th className="p-3 text-center">מסלול</th>
              <th className="p-3 text-center">תדירות שינוי</th>
              <th className="p-3 text-center">עוגן</th>
              <th className="p-3 text-center">מרווח מהעוגן</th>
              <th className="p-3 text-center bg-[#155b7e]">גרייס</th>
              <th className="p-3 text-center bg-[#155b7e]">חודשי גרייס</th>
              <th className="p-3 text-center">תאריך סיום</th>
              <th className="p-3 text-center">חודשים</th>
              <th className="p-3 text-center">ריבית %</th>
              <th className="p-3 text-center">סכום חודשי</th>
              <th className="p-3 text-center bg-[#155b7e]">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-gray-700">
            {loans.map((loan, idx) => {
              const parsedDate = parseISODate(loan.loan_end_date ?? loan.end_date ?? null);
              return (
                <tr key={loan.id} className="hover:bg-[#1d75a1]/5 transition-colors duration-150 divide-x divide-x-reverse divide-gray-100">
                  {/* סכום הלוואה */}
                  <td className="p-1.5">
                    <input
                      type="text"
                      value={Number.isFinite(loan.amount) ? loan.amount.toLocaleString("he-IL") : ""}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, "");
                        updateLoan(idx, "amount", Number(raw) || 0);
                      }}
                      className={`${inputBaseStyle} font-bold text-right`}
                    />
                  </td>

                  {/* לוח סילוקין */}
                  <td className="p-1.5">
                    <select
                      value={loan.amortization_schedule_id}
                      onChange={(e) => updateLoan(idx, "amortization_schedule_id", Number(e.target.value))}
                      className={inputBaseStyle}
                    >
                      {schedules.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.schedule_name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* מסלול */}
                  <td className="p-1.5">
                    <select
                      value={loan.path_id}
                      onChange={(e) => updateLoan(idx, "path_id", Number(e.target.value))}
                      className={`${inputBaseStyle} text-[#1d75a1] font-semibold`}
                    >
                      {paths.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* תדירות שינוי */}
                  <td className="p-1.5">
                    <input
                      type="text"
                      maxLength={3}
                      value={loan.change_frequency || ""}
                      onChange={(e) => updateLoan(idx, "change_frequency", e.target.value)}
                      className={inputBaseStyle}
                    />
                  </td>

                  {/* עוגן */}
                  <td className="p-1.5">
                    <input
                      type="text"
                      maxLength={3}
                      value={loan.anchor || ""}
                      onChange={(e) => updateLoan(idx, "anchor", e.target.value)}
                      className={`${inputBaseStyle} text-gray-500`}
                    />
                  </td>

                  {/* מרווח מהעוגן */}
                  <td className="p-1.5">
                    <input
                      type="number"
                      maxLength={3}
                      value={loan.anchor_margin ?? 0}
                      onChange={(e) => updateLoan(idx, "anchor_margin", Number(e.target.value))}
                      className={inputBaseStyle}
                    />
                  </td>

                  {/* גרייס */}
                  <td className="p-1.5 bg-gray-50/50">
                    <select
                      value={loan.grace_type_id ?? 1}
                      onChange={(e) => updateLoan(idx, "grace_type_id", Number(e.target.value))}
                      className={inputBaseStyle}
                    >
                      {graceTypes.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* חודשי גרייס */}
                  <td className="p-1.5 bg-gray-50/50">
                    <input
                      type="number"
                      min={0}
                      value={loan.grace_months ?? 0}
                      onChange={(e) => updateLoan(idx, "grace_months", Number(e.target.value))}
                      className={inputBaseStyle}
                    />
                  </td>

                  {/* תאריך סיום */}
                  <td className="p-1.5">
                    <div className="relative w-full">
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
                        className={`${inputBaseStyle} text-xs cursor-pointer`}
                      />
                    </div>
                  </td>

                  {/* חודשים */}
                  <td className="p-1.5">
                    <input
                      type="number"
                      maxLength={3}
                      value={loan.months ?? 0}
                      onChange={(e) => updateLoan(idx, "months", Number(e.target.value))}
                      className={inputBaseStyle}
                    />
                  </td>

                  {/* ריבית */}
                  <td className="p-1.5">
                    <input
                      type="number"
                      maxLength={4}
                      value={loan.rate}
                      onChange={(e) => updateLoan(idx, "rate", Number(e.target.value))}
                      className={`${inputBaseStyle} font-semibold text-emerald-600`}
                    />
                  </td>

                  {/* סכום חודשי */}
                  <td className="p-1.5 bg-gray-100/50 font-bold text-center align-middle text-gray-900">
                    {calculateLoan(loan, annualInflation).monthlyPayment.toLocaleString("he-IL", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </td>

                  {/* פעולות */}
                  <td className="p-1.5 text-center bg-gray-50/30">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => {
                          setActiveLoan(loan);
                          setIsAmortizationOpen(true);
                        }}
                        className="bg-[#1d75a1] hover:bg-[#155b7e] text-white text-xs px-2 py-1 transition-colors"
                        title="לוח סילוקין"
                      >
                        <Calendar size={12} />
                      </button>
                      <button
                        onClick={() => deleteLoan(idx)}
                        className="bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs px-2 py-1 transition-colors"
                        title="מחיקה"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* שורת סיכום פוטר לדסקטופ */}
          <tfoot className="bg-gray-100 font-bold text-gray-800 border-t-2 border-gray-300">
            <tr>
              <td className="p-3 text-right text-base text-[#1d75a1]">
                {loans
                  .reduce((sum, loan) => sum + (Number(loan.amount) || 0), 0)
                  .toLocaleString("he-IL")}
              </td>
              <td colSpan={10}></td>
              <td className="p-3 text-center text-base text-gray-900">
                {loans
                  .reduce((sum, loan) => sum + calculateLoan(loan, annualInflation).monthlyPayment, 0)
                  .toLocaleString("he-IL", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* תצוגת מובייל וטאבלט: כרטיסים רספונסיביים */}
      <div className="block lg:hidden space-y-6">
        {loans.map((loan, idx) => {
          const parsedDate = parseISODate(loan.loan_end_date ?? loan.end_date ?? null);
          const path = paths.find((p) => p.id === loan.path_id);

          return (
            <div key={loan.id} className="border border-gray-200 rounded-none bg-white shadow-sm overflow-hidden">
              {/* כותרת הכרטיס */}
              <div className="bg-[#1d75a1] text-white text-xs font-bold px-3 py-2">
                שורה {idx + 1}: {path?.name || 'מסלול חדש'}
              </div>

              {/* גריד הנתונים */}
              <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-gray-50/30 border-b border-gray-100">
                <div>
                  <label className="block text-[11px] text-gray-400 font-bold mb-0.5">סכום הלוואה</label>
                  <input
                    type="text"
                    value={Number.isFinite(loan.amount) ? loan.amount.toLocaleString("he-IL") : ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, "");
                      updateLoan(idx, "amount", Number(raw) || 0);
                    }}
                    className={`${inputBaseStyle} font-bold text-right`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 font-bold mb-0.5">לוח סילוקין</label>
                  <select
                    value={loan.amortization_schedule_id}
                    onChange={(e) => updateLoan(idx, "amortization_schedule_id", Number(e.target.value))}
                    className={inputBaseStyle}
                  >
                    {schedules.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.schedule_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 font-bold mb-0.5">מסלול</label>
                  <select
                    value={loan.path_id}
                    onChange={(e) => updateLoan(idx, "path_id", Number(e.target.value))}
                    className={`${inputBaseStyle} text-[#1d75a1] font-semibold`}
                  >
                    {paths.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 font-bold mb-0.5">תדירות שינוי</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={loan.change_frequency || ""}
                    onChange={(e) => updateLoan(idx, "change_frequency", e.target.value)}
                    className={inputBaseStyle}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 font-bold mb-0.5">עוגן</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={loan.anchor || ""}
                    onChange={(e) => updateLoan(idx, "anchor", e.target.value)}
                    className={`${inputBaseStyle} text-gray-500`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 font-bold mb-0.5">מרווח מהעוגן</label>
                  <input
                    type="number"
                    maxLength={3}
                    value={loan.anchor_margin ?? 0}
                    onChange={(e) => updateLoan(idx, "anchor_margin", Number(e.target.value))}
                    className={inputBaseStyle}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 font-bold mb-0.5">גרייס</label>
                  <select
                    value={loan.grace_type_id ?? 1}
                    onChange={(e) => updateLoan(idx, "grace_type_id", Number(e.target.value))}
                    className={inputBaseStyle}
                  >
                    {graceTypes.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 font-bold mb-0.5">חודשי גרייס</label>
                  <input
                    type="number"
                    min={0}
                    value={loan.grace_months ?? 0}
                    onChange={(e) => updateLoan(idx, "grace_months", Number(e.target.value))}
                    className={inputBaseStyle}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 font-bold mb-0.5">תאריך סיום</label>
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
                    className={`${inputBaseStyle} text-xs cursor-pointer`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 font-bold mb-0.5">חודשים</label>
                  <input
                    type="number"
                    maxLength={3}
                    value={loan.months ?? 0}
                    onChange={(e) => updateLoan(idx, "months", Number(e.target.value))}
                    className={inputBaseStyle}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 font-bold mb-0.5">ריבית %</label>
                  <input
                    type="number"
                    maxLength={4}
                    value={loan.rate}
                    onChange={(e) => updateLoan(idx, "rate", Number(e.target.value))}
                    className={`${inputBaseStyle} font-semibold text-emerald-600`}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1 bg-[#1d75a1]/5 p-1">
                  <label className="block text-[11px] text-[#1d75a1] font-bold mb-0.5">סכום חודשי</label>
                  <div className="w-full bg-white border border-[#1d75a1]/30 p-1.5 text-sm font-bold text-center text-gray-900">
                    {calculateLoan(loan, annualInflation).monthlyPayment.toLocaleString("he-IL", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </div>
                </div>
              </div>

              {/* אזור פעולות בתחתית הכרטיס למובייל */}
              <div className="px-3 py-2 bg-white flex items-center gap-2">
                <label className="text-[11px] text-gray-400 font-bold">פעולות:</label>
                <div className="flex gap-2 flex-grow justify-end">
                  <button
                    onClick={() => {
                      setActiveLoan(loan);
                      setIsAmortizationOpen(true);
                    }}
                    className="flex items-center gap-1.5 bg-[#1d75a1] hover:bg-[#155b7e] text-white text-xs px-3 py-1.5 transition-colors shadow-sm"
                  >
                    <Calendar size={14} />
                    לוח סילוקין
                  </button>
                  <button
                    onClick={() => deleteLoan(idx)}
                    className="flex items-center gap-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs px-3 py-1.5 transition-colors shadow-sm"
                  >
                    <Trash2 size={14} />
                    מחיקה
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* סיכום כולל קומפקטי למובייל */}
        <div className="p-4 bg-gray-100 border border-gray-200 font-bold text-sm space-y-2">
          <div className="flex justify-between text-[#1d75a1]">
            <span>סה"כ סכום הלוואות:</span>
            <span>
              {loans
                .reduce((sum, loan) => sum + (Number(loan.amount) || 0), 0)
                .toLocaleString("he-IL")} ₪
            </span>
          </div>
          <div className="flex justify-between text-gray-900">
            <span>סה"כ החזר חודשי:</span>
            <span>
              {loans
                .reduce((sum, loan) => sum + calculateLoan(loan, annualInflation).monthlyPayment, 0)
                .toLocaleString("he-IL", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })} ₪
            </span>
          </div>
        </div>
      </div>

      {/* מודאל לוח סילוקין פנימי */}
      <LoanAmortization
        isOpen={isAmortizationOpen}
        onClose={() => setIsAmortizationOpen(false)}
        loan={activeLoan}
        annualInflation={annualInflation}
      />
    </div>
  );
}









// "use client"

// import React from "react";
// import { LoanPath } from "@/app/data/hooks/useLoanPaths";
// import { graceTypes } from "@/app/data/graceTypes";


// import DatePicker from "react-datepicker";

// import LoanAmortization from "./LoanAmortization";
// import { useState } from "react";

// import { schedules } from "@/app/data/amortization_schedules";
// import { LoanResult, calculateLoan } from "./calculate/loanCalculators";


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
//   amortization_schedule_id: number;
//   grace_type_id?: number | null; // סוג גרייס (מתוך grace_types)
//   grace_months?: number; // ✅ חדש — מספר חודשי גרייס
// };


// type Props = {
//   loans: Loan[];
//   paths: LoanPath[];
//   onChange: (loans: Loan[]) => void;
//   annualInflation: number;
//   setAnnualInflation: (val: number) => void;
// };

// export default function LoanTable({
//   loans,
//   paths,
//   onChange,
//   annualInflation,
//   setAnnualInflation,
// }: Props) {
//   const updateLoan = (idx: number, key: keyof Loan, value: any) => {
//     const updated = [...loans];
//     updated[idx] = { ...updated[idx], [key]: value };
//     onChange(updated);
//   };

// const [isAmortizationOpen, setIsAmortizationOpen] = React.useState(false)
// const [activeLoan, setActiveLoan] = React.useState<Loan | null>(null);



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
//         loan_end_date: null,
//         amortization_schedule_id: schedules[0]?.id || 1, // ✅ ברירת מחדל
//       },
//     ]);
//   };

//   const deleteLoan = (idx: number) => {
//     const updated = [...loans];
//     updated.splice(idx, 1);
//     onChange(updated);
//   };

//   //לבטל
//   const calculateMonthly = (loan: Loan) => {
//     if (!loan.months || loan.months === 0) return 0;
//     const r = loan.rate / 12 / 100;
//     if (r === 0) return loan.amount / loan.months;
//     return (
//       (loan.amount * (r * Math.pow(1 + r, loan.months))) /
//       (Math.pow(1 + r, loan.months) - 1)
//     );
//   };

//   const parseISODate = (value?: string | Date | null): Date | null => {
//     if (!value) return null;
//     if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
//     const s = String(value);
//     const datePart = s.split("T")[0];
//     const sep = datePart.includes("-") ? "-" : "/";
//     const parts = datePart.split(sep);
//     if (parts.length === 3) {
//       if (parts[0].length === 4) {
//         const [y, m, d] = parts.map(Number);
//         if ([y, m, d].some(Number.isNaN)) return null;
//         return new Date(y, m - 1, d);
//       } else if (parts[2].length === 4) {
//         const [d, m, y] = parts.map(Number);
//         if ([y, m, d].some(Number.isNaN)) return null;
//         return new Date(y, m - 1, d);
//       }
//     }
//     const dt = new Date(s);
//     return isNaN(dt.getTime()) ? null : dt;
//   };

//   const toLocalIsoDate = (date: Date) =>
//     `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
//       2,
//       "0"
//     )}-${String(date.getDate()).padStart(2, "0")}`;


//   return (
//     <div className="overflow-x-auto">
      
//       <button
//         onClick={addLoan}
//         className="mb-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
//       >
//         + הוסף הלוואה
//       </button>


//       <table className="w-full border-collapse border border-gray-300 text-sm">
//         <thead className="bg-gray-300">
//           <tr>
//             <th className="border p-2">סכום הלוואה</th>
//             <th className="border p-2">לוח סילוקין</th>
//             <th className="border p-2">מסלול</th>
//             <th className="border p-2">תדירות שינוי</th>
//             <th className="border p-2">עוגן</th>
//             <th className="border p-2">מרווח מהעוגן</th>

//             {/* השדות החדשים */}
//             <th className="border p-2 bg-gray-400">גרייס</th>
//             <th className="border p-2 bg-gray-400">חודשי גרייס</th>

//             <th className="border p-2">תאריך סיום</th>
//             <th className="border p-2">חודשים</th>
//             <th className="border p-2">ריבית %</th>
//             <th className="border p-2">סכום חודשי</th>
//             <th className="border p-2">פעולות</th>
//           </tr>
//         </thead>

//         <tbody>
//           {loans.map((loan, idx) => {
//             const parsedDate = parseISODate(
//               loan.loan_end_date ?? loan.end_date ?? null
//             );
//             const monthlyInflation =
//               Math.pow(1 + annualInflation / 100, 1 / 12) - 1;

//             // 👇 כאן מותר לך לגשת ל-loan
//               const path = paths.find((p) => p.id === loan.path_id);
//               const isIndexed = path?.is_indexed ?? false;
             
//             //  פונקציה לחישוב סכומים כוללים לפי לוח סילוקין
     
//               const calculateTotalsForLoan = (
//                 loan: Loan,
//                 monthlyInflation: number,
//                 isIndexed: boolean
//               ) => {
//                 const monthlyPayment = calculateMonthly(loan); // סכום חודשי לפי ריבית והלוואה
//                 let openingBalance = loan.amount; // י.פ
//                 let totalPrincipal = 0;
//                 let totalInterest = 0;
//                 let totalPayment = 0;

//                 for (let i = 1; i <= loan.months; i++) {
//                   const inflationFactor = isIndexed ? Math.pow(1 + monthlyInflation, i) : 1;
//                   const actualPayment = monthlyPayment * inflationFactor;
//                   const interestPayment = openingBalance * (loan.rate / 12 / 100) * (isIndexed ? 1 + monthlyInflation : 1);
//                   const principalPayment = actualPayment - interestPayment;

//                   totalPrincipal += principalPayment;
//                   totalInterest += interestPayment;
//                   totalPayment += actualPayment;

//                   // עדכון יתרת סגירה לחודש הבא
//                   openingBalance = (openingBalance * (isIndexed ? 1 + monthlyInflation : 1)) - principalPayment;
//                 }

//                 return {
//                   totalPrincipal,
//                   totalInterest,
//                   totalPayment,
//                 };
//               };



//             return (
//               <React.Fragment key={loan.id}>
//                 <tr className="hover:bg-gray-100">
//                   {/* סכום הלוואה */}
                  
//                   <td className="border p-1 w-[120px]">
//                     <input
//                       type="text"
//                       value={Number.isFinite(loan.amount) ? loan.amount.toLocaleString("he-IL") : ""}
//                       onChange={(e) => {
//                         const raw = e.target.value.replace(/[^\d]/g, "");
//                         updateLoan(idx, "amount", Number(raw) || 0);
//                       }}
//                       className="w-full px-1 py-0.5 border rounded focus:ring-2 focus:ring-purple-400 text-right focus:bg-orange-100"
//                     />
//                   </td>

//                 {/* לוח סילוקין */}
//                   <td className="border p-1">
//                     <select
//                       value={loan.amortization_schedule_id}
//                       onChange={(e) =>
//                         updateLoan(idx, "amortization_schedule_id", Number(e.target.value))
//                       }
//                       className="w-full px-1 py-0.5 border rounded focus:ring-2 focus:ring-purple-400 focus:bg-orange-100 "
//                     >
//                       {schedules.map((s) => (
//                         <option key={s.id} value={s.id}>
//                           {s.schedule_name}
//                         </option>
//                       ))}
//                     </select>
//                   </td>

//                 {/* מסלול */}
//                   <td className="border p-1">
//                     <select
//                       value={loan.path_id}
//                       onChange={(e) =>
//                         updateLoan(idx, "path_id", Number(e.target.value))
//                       }
//                       className="w-full px-1 py-0.5 border rounded focus:ring-2 focus:ring-purple-400 focus:bg-orange-100"
//                     >
//                       {paths.map((p) => (
//                         <option key={p.id} value={p.id}>
//                           {p.name}
//                         </option>
//                       ))}
//                     </select>
//                   </td>

                                
//                   {/* תדירות שינוי */}
//                   <td className="border p-1 w-[60px]">
//                     <input
//                       type="text"
//                       maxLength={3}
//                       value={loan.change_frequency || ""}
//                       onChange={(e) =>
//                         updateLoan(idx, "change_frequency", e.target.value)
//                       }
//                       className="w-full px-1 py-0.5 border rounded focus:ring-2 focus:ring-purple-400 text-center focus:bg-orange-100 "
//                     />
//                   </td>

//                   {/* עוגן */}
//                   <td className="border p-1 w-[60px]">
//                     <input
//                       type="text"
//                       maxLength={3}
//                       value={loan.anchor || ""}
//                       onChange={(e) => updateLoan(idx, "anchor", e.target.value)}
//                       className="w-full px-1 py-0.5 border rounded focus:ring-2 focus:ring-purple-400 text-center focus:bg-orange-100 "
//                     />
//                   </td>

//                   {/* מרווח מהעוגן */}
//                   <td className="border p-1 w-[60px]">
//                     <input
//                       type="number"
//                       maxLength={3}
//                       value={loan.anchor_margin ?? 0}
//                       onChange={(e) =>
//                         updateLoan(idx, "anchor_margin", Number(e.target.value))
//                       }
//                       className="w-full px-1 py-0.5 border rounded focus:ring-2 focus:ring-purple-400 text-center focus:bg-orange-100"
//                     />
//                   </td>

//                   {/* גרייס */}
//                   <td className="border p-1 w-[80px] bg-gray-400">
//                     <select
//                       value={loan.grace_type_id ?? 1}
//                       onChange={(e) => updateLoan(idx, "grace_type_id", Number(e.target.value))}
//                       className="w-full px-1 py-0.5 border rounded focus:ring-2 focus:ring-purple-400 text-center focus:bg-orange-100"
//                     >
//                       {graceTypes.map((g) => (
//                         <option key={g.id} value={g.id}>
//                           {g.name}
//                         </option>
//                       ))}
//                     </select>
//                   </td>

//                  {/* חודשי גרייס */}
//                   <td className="border p-1 w-[60px] bg-gray-400">
//                     <input
//                       type="number"
//                       min={0}
//                       value={loan.grace_months ?? 0}
//                       onChange={(e) =>
//                         updateLoan(idx, "grace_months", Number(e.target.value))
//                       }
//                       className="w-full px-1 py-0.5 border rounded focus:ring-2 focus:ring-purple-400 text-center focus:bg-orange-100"
//                     />
//                   </td>
//                   {/* תאריך סיום */}
//                   <td className="border p-1">
//                     <DatePicker
//                       selected={parsedDate ?? null}
//                       onChange={(date: Date | null) => {
//                         if (date) {
//                           const iso = toLocalIsoDate(date);
//                           updateLoan(idx, "loan_end_date", iso);
//                         } else {
//                           updateLoan(idx, "loan_end_date", null);
//                         }
//                       }}
//                       dateFormat="dd/MM/yyyy"
//                       placeholderText="בחר תאריך"
//                       showMonthDropdown
//                       showYearDropdown
//                       dropdownMode="select"
//                       className="w-full px-1 py-0.5 border rounded text-center focus:ring-2 focus:ring-purple-400"
//                     />
//                   </td>

//                   {/* חודשים */}
//                   <td className="border p-1 w-[60px]">
//                     <input
//                       type="number"
//                       maxLength={3}
//                       value={loan.months ?? 0}
//                       onChange={(e) =>
//                         updateLoan(idx, "months", Number(e.target.value))
//                       }
//                       className="w-full px-1 py-0.5 border rounded text-center focus:ring-2 focus:ring-purple-400 before:focus:bg-orange-100 focus:bg-orange-100 "
//                     />
//                   </td>

//                   {/* ריבית */}
//                   <td className="border p-1 w-[70px]">
//                     <input
//                       type="number"
//                       maxLength={4}
//                       value={loan.rate}
//                       onChange={(e) =>
//                         updateLoan(idx, "rate", Number(e.target.value))
//                       }
//                       className="w-full px-1 py-0.5 border rounded text-center focus:ring-2 focus:ring-purple-400 focus:bg-orange-100"
//                     />
//                   </td>

//                   {/* סכום חודשי */}
//                   <td className="border p-1 text-right">
//                     {calculateLoan(loan, annualInflation).monthlyPayment.toLocaleString("he-IL", {
//                       minimumFractionDigits: 0,
//                       maximumFractionDigits: 0,
//                     })}
//                   </td>                              

//                   {/* פעולות */}
//                   <td className="border p-1 w-[140px]">
//                     <div className="flex gap-2 justify-center">
//                       <button
//                         onClick={() => {
//                           setActiveLoan(loan);
//                           setIsAmortizationOpen(true);
//                         }}
//                         className="w-[65px] px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
//                       >
//                         לוח
//                       </button>
//                       <button
//                         onClick={() => deleteLoan(idx)}
//                         className="w-[65px] px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
//                       >
//                         מחיקה
//                       </button>
//                     </div>
//                   </td>
//                 </tr>  
           
           
           
           
//                 <tr className="hidden"  >
//                   <td colSpan={10} className="border p-2">
//                     <div className="flex flex-col gap-1 text-xs">
//                       {/* אינפלציה */}
//                       <div className="text-red-600">
//                         <p className="m-0">
//                           אינפלציה צפויה (שנתית): {annualInflation.toFixed(2)}%
//                         </p>
//                         <p className="m-0">
//                           אינפלציה חודשית: {(monthlyInflation * 100).toFixed(3)}%
//                         </p>
                       
//                        <p className="m-0">
//                           צמוד מדד: {isIndexed ? "true" : "false"}
//                        </p>
                                
//                         <p className="m-0">mix_id: {loan.mix_id}</p>
//                         <p className="m-0">path_id: {loan.path_id}</p>
//                       </div>
//                     </div>


//                   </td>

//                 </tr>

//                 {/* סיכום הלוואה */}
//                 <tr className="hidden">
//                   <td colSpan={10} className="border p-2 bg-yellow-50 text-xs">
//                     {(() => {
//                       const totals = calculateTotalsForLoan(loan, monthlyInflation, isIndexed);
//                       return (
//                         <div className="flex gap-6">
//                           <span>סה"כ קרן: {totals.totalPrincipal.toLocaleString("he-IL")}</span>
//                           <span>סה"כ ריבית: {totals.totalInterest.toLocaleString("he-IL", {
//                             minimumFractionDigits: 2,
//                             maximumFractionDigits: 2,
//                           })}</span>
//                           <span>סה"כ החזר: {totals.totalPayment.toLocaleString("he-IL", {
//                             minimumFractionDigits: 2,
//                             maximumFractionDigits: 2,
//                           })}</span>
//                         </div>
//                       );
//                     })()}
//                   </td>
//                 </tr>


//               </React.Fragment>
//             );
//           })}

//         </tbody>

//         <tfoot className="bg-gray-100 font-bold">
//           <tr>
//             <td className="border p-2 text-right">
//               {loans
//                 .reduce((sum, loan) => sum + (Number(loan.amount) || 0), 0)
//                 .toLocaleString("he-IL")}
//             </td>
//             <td className="border p-2"></td>
//             <td className="border p-2"></td>
//             <td className="border p-2"></td>
//             <td className="border p-2"></td>
//             <td className="border p-2"></td>
//             <td className="border p-2"></td>
//             <td className="border p-2"></td>
//             <td className="border p-2"></td>
//             <td className="border p-2"></td>
//             <td className="border p-2"></td>
//             <td className="border p-2 text-right">
//               {loans
//                 .reduce((sum, loan) => {
//                   const result = calculateLoan(loan, annualInflation);
//                   return sum + result.monthlyPayment;
//                 }, 0)
//                 .toLocaleString("he-IL", {
//                   minimumFractionDigits: 0,
//                   maximumFractionDigits: 0,
//                 })}
//             </td>

//             <td className="border p-2"></td>
//           </tr>       
//       {/* סיכום הלוואה */}


      
      
//         </tfoot>



//       </table>

//         <LoanAmortization
//           isOpen={isAmortizationOpen}
//           onClose={() => setIsAmortizationOpen(false)}
//           loan={activeLoan}
//           annualInflation={annualInflation}   // 👈 עכשיו באמת יעבור מהסטייט
//         />


//     </div>
//   );
// }













