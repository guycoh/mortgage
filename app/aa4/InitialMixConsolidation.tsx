"use client";

import React, { useMemo } from "react";

export type InitialMixLoan = {
  balance: string;
  interest: string;
  months: string;
  type: string; // השדה החדש עבור סוג ההלוואה
};

interface InitialMixConsolidationProps {
  loans: InitialMixLoan[];
  onUpdateLoan: (i: number, key: keyof InitialMixLoan, value: string) => void;
  onDeleteLoan: (i: number) => void;
  onAddLoan: () => void;
  calcPayment: (balance: string, interest: string, months: string) => number;
  parse: (v: string) => number;
  format: (v: string) => string;
}

export default function InitialMixConsolidation({
  loans,
  onUpdateLoan,
  onDeleteLoan,
  onAddLoan,
  calcPayment,
  parse,
  format,
}: InitialMixConsolidationProps) {
  
  // חישוב סך כל סכומי המסלולים
  const totalBalance = useMemo(() => {
    return loans.reduce((sum, l) => sum + parse(l.balance), 0);
  }, [loans, parse]);

  // חישוב סך כל ההחזרים החודשיים המשוערים
  const totalNewPayment = useMemo(() => {
    return loans.reduce((sum, l) => sum + calcPayment(l.balance, l.interest, l.months), 0);
  }, [loans, calcPayment]);

  return (
   <div className="w-full space-y-3" dir="rtl">
  {/* כותרת וכפתור הוספה */}
  <div className="flex items-center justify-between gap-2">
    <div className="font-bold text-slate-700 text-sm md:text-base">תמהיל ראשוני לאיחוד הלוואות</div>
    <button
      onClick={onAddLoan}
      className="text-[11px] bg-emerald-600 text-white font-semibold px-2.5 py-1.5 rounded-lg hover:bg-emerald-700 shadow-sm transition shrink-0"
    >
      + הוספת מסלול
    </button>
  </div>

  {/* טבלת תמהיל מצומצמת במיוחד */}
  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-slate-50">
    <table className="table-fixed w-full text-[11px] border-collapse">
      <thead>
        <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
          <th className="p-1.5 font-bold text-right w-[95px]">סוג</th>
          <th className="p-1.5 font-bold text-right w-[85px]">סכום</th>
          <th className="p-1.5 font-bold text-center w-[50px]">ריבית</th>
          <th className="p-1.5 font-bold text-center w-[55px]">חודשים</th>
          <th className="p-1.5 font-bold text-center w-[85px]">החזר חודשי</th>
          <th className="p-1.5 w-[50px]"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {loans.map((l, i) => (
          <tr key={i} className="bg-white hover:bg-slate-50/50 transition">
            
            {/* שדה סלקט - סוג הלוואה צפוף */}
            <td className="p-1">
              <select
                value={l.type || ""}
                onChange={(e) => onUpdateLoan(i, "type", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1 px-1 text-right font-medium focus:outline-none focus:ring-1 focus:ring-[#1d75a1] focus:bg-white text-[11px] cursor-pointer"
              >
                <option value="" disabled hidden>בחר...</option>
                <option value="מחזור דיור">מחזור דיור</option>
                <option value="כל מטרה">כל מטרה</option>
                <option value="שיפוץ">שיפוץ</option>
                <option value="דרגה שניה">דרגה ב'</option>
              </select>
            </td>

            {/* שדה סכום קומפקטי */}
            <td className="p-1">
              <input
                maxLength={10}
                value={l.balance}
                onChange={(e) => onUpdateLoan(i, "balance", format(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1 px-1.5 text-right font-medium focus:outline-none focus:ring-1 focus:ring-[#1d75a1] focus:bg-white text-[11px]"
                placeholder="0"
              />
            </td>

            {/* שדה ריבית צר */}
            <td className="p-1">
              <input
                maxLength={5}
                value={l.interest}
                onChange={(e) => onUpdateLoan(i, "interest", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1 px-0.5 text-center font-medium focus:outline-none focus:ring-1 focus:ring-[#1d75a1] focus:bg-white text-[11px]"
                placeholder="0%"
              />
            </td>

            {/* שדה חודשים צר */}
            <td className="p-1">
              <input
                maxLength={3}
                value={l.months}
                onChange={(e) => onUpdateLoan(i, "months", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1 px-0.5 text-center font-medium focus:outline-none focus:ring-1 focus:ring-[#1d75a1] focus:bg-white text-[11px]"
                placeholder="0"
              />
            </td>

            {/* חישוב החזר חודשי */}
            <td className="p-1 text-center font-bold text-slate-700 text-[11px] whitespace-nowrap">
              {Math.round(calcPayment(l.balance, l.interest, l.months)).toLocaleString()} ₪
            </td>

            {/* כפתור מחיקה קטנטן */}
            <td className="p-1 text-center">
              <button
                onClick={() => onDeleteLoan(i)}
                className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 rounded-md px-1.5 py-0.5 font-medium text-[10px] transition"
              >
                מחיקה
              </button>
            </td>
          </tr>
        ))}
      </tbody>
      
      {/* שורת סיכומים תחתונה דחוסה */}
     {/* שורת סיכומים תחתונה דחוסה */}
        <tfoot>
        <tr className="bg-slate-50/80 font-bold border-t border-slate-200 text-[11px] text-slate-800">
            <td colSpan={2} className="p-2 text-right text-slate-700 font-bold">
            {"סה\"כ סכום:"} <span className="text-slate-900 font-extrabold">{totalBalance.toLocaleString()} ₪</span>
            </td>
            <td colSpan={2} className="p-2 text-left font-medium text-slate-500 whitespace-nowrap">
            {"החזר תמהיל:"}
            </td>
            <td className="p-2 text-center text-[#1d75a1] font-extrabold text-xs whitespace-nowrap">
            {Math.round(totalNewPayment).toLocaleString()} ₪
            </td>
            <td></td>
        </tr>
        </tfoot>
    </table>
  </div>
</div>
  );
}