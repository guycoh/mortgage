"use client"

import { useMemo, useState } from "react";

type Loan = {
  balance: string;
  interest: string;
  months: string;
};

// הגדרת ה-Props שהמודאל מקבל מהסימולטור הראשי
type LoanConsolidationProps = {
  isLoanConsolidationOpen: boolean;
  onClose: () => void;
};

export default function LoanConsolidation({ isLoanConsolidationOpen, onClose }: LoanConsolidationProps) {
  const [newMonths, setNewMonths] = useState(360);
  const [newInterest, setNewInterest] = useState(7);
  const [loans, setLoans] = useState<Loan[]>([
    { balance: "", interest: "", months: "" }
  ]);

  // אם המודאל סגור - לא מרנדרים כלום
  if (!isLoanConsolidationOpen) return null;

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
    // שכבת רקע כהה (Backdrop) - לחיצה עליה תסגור את המודאל
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* גוף המודאל - עצירת ה-Click Propagation כדי שלחיצה בפנים לא תסגור אותו */}
      <div 
        className="font-open-sans font-normal bg-white rounded-2xl border-2 border-[#1d75a1] p-6 space-y-4 text-sm w-full max-w-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* כפתור סגירה X בפינה העליונה */}
        <button 
          onClick={onClose}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 text-xl font-bold transition"
        >
          ✕
        </button>

        <h3 className="font-bold text-lg text-gray-800 text-center">
          מחשבון איחוד הלוואות
        </h3>

        {/* הלוואות קיימות */}
        <div className="w-full">
          <div className="flex items-center justify-start gap-3 mb-2">
            <div className="font-bold text-gray-800">הזן הלוואות קיימות</div>
            <button
              onClick={addLoan}
              className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-800 transition"
            >
              + הוספת הלוואה
            </button>
          </div>

          <div className="border rounded-xl overflow-hidden bg-gray-50">
            <table className="table-fixed w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-1 w-24">יתרה</th>
                  <th className="border p-1 w-20">ריבית</th>
                  <th className="border p-1 w-16">חודשים</th>
                  <th className="border p-1 w-24">החזר</th>
                  <th className="border p-1 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {loans.map((l, i) => (
                  <tr key={i} className="bg-white">
                    <td className="border p-1">
                      <input
                        maxLength={9}
                        value={l.balance}
                        onChange={(e) => updateLoan(i, "balance", format(e.target.value))}
                        className="w-full bg-gray-50 border rounded p-1 text-center"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        maxLength={5}
                        value={l.interest}
                        onChange={(e) => updateLoan(i, "interest", e.target.value)}
                        className="w-full bg-gray-50 border rounded p-1 text-center"
                      />
                    </td>
                    <td className="border p-1">
                      <input
                        maxLength={3}
                        value={l.months}
                        onChange={(e) => updateLoan(i, "months", e.target.value)}
                        className="w-full bg-gray-50 border rounded p-1 text-center"
                      />
                    </td>
                    <td className="border p-1 text-center font-bold">
                      {Math.round(calcPayment(l.balance, l.interest, l.months)).toLocaleString()} ₪
                    </td>
                    <td className="border p-1 text-center">
                      <button
                        onClick={() => deleteLoan(i)}
                        className="bg-red-500 text-white rounded-lg px-2 py-1 text-xs hover:bg-red-600"
                      >
                        מחיקה
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={3} className="border p-2 text-right">סה״כ</td>
                  <td className="border p-2 text-center text-blue-700">
                    {Math.round(oldPayment).toLocaleString()} ₪
                  </td>
                  <td className="border"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* תמהיל חדש */}
        <div>
          <div className="font-bold mb-2 text-gray-800">איחוד למשכנתא</div>
          <div className="border rounded-xl overflow-hidden bg-blue-50">
            <table className="w-full table-fixed text-xs border-collapse">
              <thead>
                <tr className="bg-blue-100">
                  <th className="border p-1 w-24">סכום איחוד</th>
                  <th className="border p-1 w-20">ריבית</th>
                  <th className="border p-1 w-16">חודשים</th>
                  <th className="border p-1 w-24">החזר חדש</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="border p-2 text-center font-bold">
                    {totalBalance.toLocaleString()} ₪
                  </td>
                  <td className="border p-1">
                    <input
                      value={newInterest}
                      onChange={(e) => setNewInterest(+e.target.value)}
                      className="w-full bg-gray-50 border rounded p-1 text-center"
                    />
                  </td>
                  <td className="border p-1">
                    <input
                      type="number"
                      value={newMonths}
                      onChange={(e) => setNewMonths(+e.target.value)}
                      className="w-full bg-gray-50 border rounded p-1 text-center"
                    />
                  </td>
                  <td className="border p-2 text-center font-bold">
                    {Math.round(newPayment).toLocaleString()} ₪
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* סיכום */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 border rounded-xl text-center bg-gray-50">
            החזר היום <br />
            <b>{Math.round(oldPayment).toLocaleString()} ₪</b>
          </div>
          <div className="p-3 border rounded-xl text-center bg-gray-50">
            החזר חדש <br />
            <b>{Math.round(newPayment).toLocaleString()} ₪</b>
          </div>
          <div className="p-3 border rounded-xl text-center bg-green-50">
            שינוי בהחזר חודשי <br />
            <b className="text-green-700">{Math.round(saving).toLocaleString()} ₪</b>
          </div>
        </div>

      </div>
    </div>
  );
}