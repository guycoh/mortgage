"use client"

import { useMemo, useState } from "react";

type Loan = {
  balance: string;
  interest: string;
  months: string;
};

export default function LoanConsolidation() {
  const [newMonths, setNewMonths] = useState(360);
  const [newInterest, setNewInterest] = useState(7);
  const [loans, setLoans] = useState<Loan[]>([
    { balance: "", interest: "", months: "" }
  ]);

  const format = (v: string) =>
    v.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const parse = (v: string) => Number(v.replace(/,/g, "") || 0);

  const updateLoan = (i: number, key: keyof Loan, value: string) => {
    const copy = [...loans];
    copy[i] = { ...copy[i], [key]: value };
    setLoans(copy);
  };

  const deleteLoan = (i: number) => {
    if (loans.length === 1) return;
    setLoans(loans.filter((_, index) => index !== i));
  };

  const calcPayment = (balance: string, interest: string, months: string) => {
    const amount = parse(balance);
    const r = parseFloat(interest) / 100 / 12;
    const m = Number(months);
    if (!amount || !m || !r) return 0;
    return amount * (r / (1 - Math.pow(1 + r, -m)));
  };

  const totalBalance = useMemo(() => {
    return loans.reduce((sum, l) => sum + parse(l.balance), 0);
  }, [loans]);

  const oldPayment = useMemo(() => {
    return loans.reduce((sum, l) => sum + calcPayment(l.balance, l.interest, l.months), 0);
  }, [loans]);

  const addLoan = () => {
    setLoans([...loans, { balance: "", interest: "", months: "" }]);
  };

  const newPayment = useMemo(() => {
    const amount = totalBalance;
    const r = newInterest / 100 / 12;
    if (!amount) return 0;
    return amount * (r / (1 - Math.pow(1 + r, -newMonths)));
  }, [totalBalance, newInterest, newMonths]);

  const saving = oldPayment - newPayment;

  return (
    <div className="font-sans font-normal bg-white rounded-2xl p-6 md:p-8 space-y-8 text-sm w-full max-w-3xl mx-auto" dir="rtl">
      
      <h3 className="font-extrabold text-2xl text-slate-800 text-center tracking-tight">
        סימולטור איחוד הלוואות למשכנתא
      </h3>

      {/* חלק 1: הלוואות קיימות */}
      <div className="w-full space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="font-bold text-slate-700 text-base">1. פירוט הלוואות קיימות</div>
          <button onClick={addLoan} className="text-xs bg-emerald-600 text-white font-semibold px-4 py-2 rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-600/10 transition">
            + הוספת הלוואה
          </button>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-slate-50">
          <table className="table-fixed w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                <th className="p-3 font-bold text-right">יתרה לבדיקה</th>
                <th className="p-3 font-bold text-center w-24">ריבית (%)</th>
                <th className="p-3 font-bold text-center w-24">חודשים נותרו</th>
                <th className="p-3 font-bold text-center w-32">החזר חודשי</th>
                <th className="p-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loans.map((l, i) => (
                <tr key={i} className="bg-white hover:bg-slate-50/50 transition">
                  <td className="p-2">
                    <input maxLength={9} value={l.balance} onChange={e => updateLoan(i, "balance", format(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-right font-medium focus:outline-none focus:ring-2 focus:ring-[#1d75a1] focus:bg-white transition" placeholder="0" />
                  </td>
                  <td className="p-2">
                    <input maxLength={5} value={l.interest} onChange={e => updateLoan(i, "interest", e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 desert-input text-center font-medium focus:outline-none focus:ring-2 focus:ring-[#1d75a1] focus:bg-white transition" placeholder="0%" />
                  </td>
                  <td className="p-2">
                    <input maxLength={3} value={l.months} onChange={e => updateLoan(i, "months", e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-center font-medium focus:outline-none focus:ring-2 focus:ring-[#1d75a1] focus:bg-white transition" placeholder="0" />
                  </td>
                  <td className="p-2 text-center font-bold text-slate-700 text-sm">
                    {Math.round(calcPayment(l.balance, l.interest, l.months)).toLocaleString()} ₪
                  </td>
                  <td className="p-2 text-center">
                    <button onClick={() => deleteLoan(i)} className="text-red-500 hover:text-red-700 font-medium text-xs transition p-1">
                      מחיקה
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50/80 font-bold border-t border-slate-200 text-sm text-slate-800">
                <td colSpan={3} className="p-4 text-right">סה"כ החזרים נוכחיים:</td>
                <td className="p-4 text-center text-[#1d75a1] font-extrabold text-base">
                  {Math.round(oldPayment).toLocaleString()} ₪
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* חלק 2: תמהיל חדש */}
      <div className="space-y-3">
        <div className="font-bold text-slate-700 text-base">2. תנאי המשכנתא החדשה (איחוד)</div>
        <div className="border border-[#1d75a1]/20 rounded-2xl overflow-hidden shadow-sm bg-[#1d75a1]/5">
          <table className="w-full table-fixed text-xs border-collapse">
            <thead>
              <tr className="bg-[#1d75a1]/10 text-slate-700 border-b border-[#1d75a1]/20">
                <th className="p-3 font-bold text-right">סכום האיחוד הכולל</th>
                <th className="p-3 font-bold text-center w-28">ריבית שנתית (%)</th>
                <th className="p-3 font-bold text-center w-28">תקופה (חודשים)</th>
                <th className="p-3 font-bold text-center w-32">החזר חודשי חדש</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white">
                <td className="p-4 text-right font-extrabold text-slate-800 text-base">
                  {totalBalance.toLocaleString()} ₪
                </td>
                <td className="p-2">
                  <input value={newInterest} onChange={e => setNewInterest(+e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-center font-bold text-[#1d75a1] focus:outline-none focus:ring-2 focus:ring-[#1d75a1] focus:bg-white transition" />
                </td>
                <td className="p-2">
                  <input type="number" value={newMonths} onChange={e => setNewMonths(+e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-center font-bold text-[#1d75a1] focus:outline-none focus:ring-2 focus:ring-[#1d75a1] focus:bg-white transition" />
                </td>
                <td className="p-4 text-center font-extrabold text-emerald-600 text-base">
                  {Math.round(newPayment).toLocaleString()} ₪
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* חלק 3: כרטיסי סיכום יוקרתיים */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase">החזר חודשי היום</span>
          <div className="text-lg font-extrabold text-slate-700">{Math.round(oldPayment).toLocaleString()} ₪</div>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase">החזר חודשי משודרג</span>
          <div className="text-lg font-extrabold text-[#1d75a1]">{Math.round(newPayment).toLocaleString()} ₪</div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center space-y-1 shadow-md shadow-emerald-600/5">
          <span className="text-xs font-bold text-emerald-700 uppercase">החיסכון החודשי שלכם</span>
          <div className="text-xl font-black text-emerald-600">{Math.round(saving).toLocaleString()} ₪</div>
        </div>
      </div>

    </div>
  );
}