"use client"

import { useMemo } from "react";

export type Loan = {
  balance: string;
  interest: string;
  months: string;
};

interface ExistingLoansProps {
  loans: Loan[];
  onUpdateLoan: (i: number, key: keyof Loan, value: string) => void;
  onDeleteLoan: (i: number) => void;
  onAddLoan: () => void;
  calcPayment: (balance: string, interest: string, months: string) => number;
  parse: (v: string) => number;
  format: (v: string) => string;
}

export default function ExistingLoans({
  loans,
  onUpdateLoan,
  onDeleteLoan,
  onAddLoan,
  calcPayment,
  parse,
  format,
}: ExistingLoansProps) {
  
  // חישוב סך כל יתרות ההלוואה
  const totalBalance = useMemo(() => {
    return loans.reduce((sum, l) => sum + parse(l.balance), 0);
  }, [loans, parse]);

  // חישוב סך כל ההחזרים החודשיים הנוכחיים
  const totalOldPayment = useMemo(() => {
    return loans.reduce((sum, l) => sum + calcPayment(l.balance, l.interest, l.months), 0);
  }, [loans, calcPayment]);

  return (
    <div className="w-full space-y-3" dir="rtl">
      {/* כותרת וכפתור הוספה */}
      <div className="flex items-center justify-between gap-2">
        <div className="font-bold text-slate-700 text-sm md:text-base">פירוט הלוואות קיימות</div>
        <button
          onClick={onAddLoan}
          className="text-[11px] bg-emerald-600 text-white font-semibold px-2.5 py-1.5 rounded-lg hover:bg-emerald-700 shadow-sm transition shrink-0"
        >
          + הוספת הלוואה
        </button>
      </div>

      {/* טבלת הלוואות מצומצמת במיוחד להתאמה לחצי מסך */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-slate-50">
        <table className="table-fixed w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
              <th className="p-1.5 font-bold text-right w-[110px]">יתרת הלוואה</th>
              <th className="p-1.5 font-bold text-center w-[55px]">ריבית</th>
              <th className="p-1.5 font-bold text-center w-[60px]">חודשים</th>
              <th className="p-1.5 font-bold text-center w-[90px]">החזר חודשי</th>
              <th className="p-1.5 w-[50px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loans.map((l, i) => (
              <tr key={i} className="bg-white hover:bg-slate-50/50 transition">
                
                {/* שדה יתרה */}
                <td className="p-1">
                  <input
                    maxLength={10}
                    value={l.balance}
                    onChange={(e) => onUpdateLoan(i, "balance", format(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1 px-1.5 text-right font-medium focus:outline-none focus:ring-1 focus:ring-[#1d75a1] focus:bg-white text-[11px]"
                    placeholder="0"
                  />
                </td>

                {/* שדה ריבית */}
                <td className="p-1">
                  <input
                    maxLength={5}
                    value={l.interest}
                    onChange={(e) => onUpdateLoan(i, "interest", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1 px-0.5 text-center font-medium focus:outline-none focus:ring-1 focus:ring-[#1d75a1] focus:bg-white text-[11px]"
                    placeholder="0%"
                  />
                </td>

                {/* שדה חודשים */}
                <td className="p-1">
                  <input
                    maxLength={3}
                    value={l.months}
                    onChange={(e) => onUpdateLoan(i, "months", e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1 px-0.5 text-center font-medium focus:outline-none focus:ring-1 focus:ring-[#1d75a1] focus:bg-white text-[11px]"
                    placeholder="0"
                  />
                </td>

                {/* החזר חודשי מחושב */}
                <td className="p-1 text-center font-bold text-slate-700 text-[11px] whitespace-nowrap">
                  {Math.round(calcPayment(l.balance, l.interest, l.months)).toLocaleString()} ₪
                </td>

                {/* כפתור מחיקה קטן */}
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
          
          {/* שורת סיכומים תחתונה דחוסה ללא שבירת JSX */}
          <tfoot>
            <tr className="bg-slate-50/80 font-bold border-t border-slate-200 text-[11px] text-slate-800">
              <td className="p-2 text-right text-slate-700 font-bold whitespace-nowrap">
                {"סך הכל:"} <span className="text-slate-900 font-extrabold">{totalBalance.toLocaleString()} ₪</span>
              </td>
              <td colSpan={2} className="p-2 text-left font-medium text-slate-500 whitespace-nowrap">
                {"החזר נוכחי:"}
              </td>
              <td className="p-2 text-center text-[#1d75a1] font-extrabold text-xs whitespace-nowrap">
                {Math.round(totalOldPayment).toLocaleString()} ₪
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}