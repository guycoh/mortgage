"use client"

import { useMemo } from "react";

type Loan = {
  amount: number;            // סכום הלוואה
  months: number;            // מספר חודשים
  isIndexed: boolean;        // צמוד למדד?
  annualRate: number;        // ריבית שנתית %
  monthlyRate: number;       // ריבית חודשית %
  annualIndex: number;       // מדד שנתי %
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan;
};

type AmortizationRow = {
  month: number;
  openingBalance: number;     // יתרה פתיחה
  indexedBalance: number;     // יתרה לאחר הצמדה
  payment: number;            // תשלום חודשי
  interest: number;
  principal: number;
  closingBalance: number;     // יתרה סגירה
  monthlyIndexRate: number;   // אחוז הצמדה חודשי
};

export default function AmortizationModal({ isOpen, onClose, loan }: Props) {
  const schedule: AmortizationRow[] = useMemo(() => {
    const rows: AmortizationRow[] = [];
    let balance = loan.amount;

    const monthlyIndexRate = Math.pow(1 + loan.annualIndex / 100, 1 / 12) - 1;

    for (let m = 1; m <= loan.months; m++) {
      const openingBalance = balance;

      // אם צמוד – נעדכן את היתרה
      if (loan.isIndexed) {
        balance = balance * (1 + monthlyIndexRate);
      }

      // חישוב תשלום חודשי לפי נוסחת שפיצר
      const monthsLeft = loan.months - m + 1;
      const monthlyPayment =
        (balance * (loan.monthlyRate / 100)) /
        (1 - Math.pow(1 + loan.monthlyRate / 100, -monthsLeft));

      const interest = balance * (loan.monthlyRate / 100);
      const principal = monthlyPayment - interest;

      balance -= principal;

      rows.push({
        month: m,
        openingBalance,
        indexedBalance: loan.isIndexed ? openingBalance * (1 + monthlyIndexRate) : openingBalance,
        payment: monthlyPayment,
        interest,
        principal,
        closingBalance: balance < 0 ? 0 : balance,
        monthlyIndexRate: loan.isIndexed ? monthlyIndexRate * 100 : 0,
      });
    }

    return rows;
  }, [loan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-auto p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-6xl shadow-xl max-h-[90vh] overflow-auto">
        <h2 className="text-xl font-bold mb-4 text-center">נתוני ההלוואה ולוח סילוקין</h2>

        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div><strong>סכום הלוואה:</strong> {loan.amount.toLocaleString()} ₪</div>
          <div><strong>מספר חודשים:</strong> {loan.months}</div>
          <div><strong>צמוד למדד:</strong> {loan.isIndexed ? "כן" : "לא"}</div>
          <div><strong>ריבית שנתית:</strong> {loan.annualRate.toFixed(2)}%</div>
          <div><strong>ריבית חודשית:</strong> {loan.monthlyRate.toFixed(3)}%</div>
          <div><strong>מדד שנתי:</strong> {loan.annualIndex.toFixed(2)}%</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-300 table-auto">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="border px-2 py-1">חודש</th>
                <th className="border px-2 py-1">יתרה פתיחה</th>
                {loan.isIndexed && <th className="border px-2 py-1">יתרה לאחר הצמדה</th>}
                <th className="border px-2 py-1">תשלום חודשי</th>
                <th className="border px-2 py-1">ריבית</th>
                <th className="border px-2 py-1">קרן</th>
                <th className="border px-2 py-1">יתרה סגירה</th>
                {loan.isIndexed && <th className="border px-2 py-1">מדד חודשי</th>}
              </tr>
            </thead>
            <tbody>
              {schedule.map((row) => (
                <tr key={row.month} className="text-center">
                  <td className="border px-2 py-1">{row.month}</td>
                  <td className="border px-2 py-1">{row.openingBalance.toFixed(2)}</td>
                  {loan.isIndexed && <td className="border px-2 py-1">{row.indexedBalance.toFixed(2)}</td>}
                  <td className="border px-2 py-1">{row.payment.toFixed(2)}</td>
                  <td className="border px-2 py-1">{row.interest.toFixed(2)}</td>
                  <td className="border px-2 py-1">{row.principal.toFixed(2)}</td>
                  <td className="border px-2 py-1">{row.closingBalance.toFixed(2)}</td>
                  {loan.isIndexed && <td className="border px-2 py-1">{row.monthlyIndexRate.toFixed(3)}%</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-center mt-6">
          <button
            className="px-4 py-2 bg-orange-500 text-white rounded-lg"
            onClick={onClose}
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}




// "use client"

// type Loan = {
//   amount: number;            // סכום הלוואה
//   monthlyPayment: number;    // תשלום חודשי
//   annualInflation: number;   // שיעור אינפלציה שנתי %
//   monthlyInflation: number;  // שיעור אינפלציה חודשי %
//   months: number;            // מספר חודשים
//   isIndexed: boolean;        // צמוד למדד?
//   annualRate: number;        // ריבית שנתית %
//   monthlyRate: number;       // ריבית חודשית %
// };

// type Props = {
//   isOpen: boolean;
//   onClose: () => void;
//   loan: Loan;
// };

// export default function AmortizationModal({ isOpen, onClose, loan }: Props) {
//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
//       <div className="bg-white rounded-xl p-6 w-11/12 max-w-3xl shadow-xl">
//         <h2 className="text-xl font-bold mb-4 text-center">נתוני ההלוואה</h2>

//         <div className="grid grid-cols-2 gap-4 text-sm">
//           <div><strong>סכום הלוואה:</strong> {loan.amount.toLocaleString()} ₪</div>
//           <div><strong>תשלום חודשי:</strong> {loan.monthlyPayment.toFixed(2)} ₪</div>      
//           <div><strong>שיעור אינפלציה חודשי:</strong> {loan.monthlyInflation.toFixed(3)}%</div>
//           <div><strong>מספר חודשים:</strong> {loan.months}</div>
//           <div><strong>צמוד למדד:</strong> {loan.isIndexed ? "כן" : "לא"}</div>
//           <div><strong>ריבית שנתית:</strong> {loan.annualRate.toFixed(2)}%</div>
//           <div><strong>ריבית חודשית:</strong> {loan.monthlyRate.toFixed(3)}%</div>
//         </div>

//         <div className="flex justify-center mt-6">
//           <button
//             className="px-4 py-2 bg-orange-500 text-white rounded-lg"
//             onClick={onClose}
//           >
//             סגור
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
