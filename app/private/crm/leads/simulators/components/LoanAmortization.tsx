"use client"


import { Loan, LoanResult, ScheduleRow, calculateLoan } from "./calculate/loanCalculators";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  loan?: Loan | null;
  path?: { id: number; name: string; is_indexed?: boolean };
  annualInflation?: number; // באחוזים
};

export default function LoanAmortization({
  isOpen,
  onClose,
  loan,
  path,
  annualInflation = 0,
}: Props) {
  if (!isOpen || !loan) return null;

  const isIndexed = path?.is_indexed ?? false;

  // מחשב את ההלוואה כולל לוח סילוקין
 const result: LoanResult = calculateLoan(loan, isIndexed, annualInflation);

  // יוצרים לוח סילוקין אם לא קיים
  if (!result.schedule && loan.amortization_schedule_id === 2) {
    const schedule: ScheduleRow[] = [];
    const r = loan.rate / 12 / 100;
    let openingBalance = loan.amount;
    const monthlyInflation = isIndexed ? Math.pow(1 + annualInflation / 100, 1 / 12) - 1 : 0;

    for (let i = 1; i <= loan.months; i++) {
      const inflationFactor = Math.pow(1 + monthlyInflation, i);
      const principalPayment = loan.amount / loan.months;
      const interestPayment = openingBalance * r;
      const monthlyPayment = principalPayment + interestPayment;

      const closingBalance = openingBalance - principalPayment;

      schedule.push({
        month: i,
        openingBalance,
        principal: principalPayment,
        interest: interestPayment,
        payment: monthlyPayment * (isIndexed ? inflationFactor : 1),
        closingBalance,
      });

      openingBalance = closingBalance;
    }

    result.schedule = schedule;
    result.totalPaid = schedule.reduce((acc, s) => acc + s.payment, 0);
    result.totalInterest = schedule.reduce((acc, s) => acc + s.interest, 0);
    result.maxMonthlyPayment = Math.max(...schedule.map((s) => s.payment));
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-center items-start overflow-auto z-50">
      <div className="bg-white p-4 m-8 rounded shadow-lg w-full max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">לוח סילוקין - {path?.name || "הלוואה"}</h2>
          <button
            onClick={onClose}
            className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            סגור
          </button>
        </div>

        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-1">חודש</th>
              <th className="border p-1">י.פ</th>
              <th className="border p-1">קרן</th>
              <th className="border p-1">ריבית</th>
              <th className="border p-1">תשלום חודשי</th>
              <th className="border p-1">י.ס</th>
            </tr>
          </thead>
          <tbody>
            {result.schedule?.map((s) => (
              <tr key={s.month} className="hover:bg-gray-100">
                <td className="border p-1 text-center">{s.month}</td>
                <td className="border p-1 text-right">{s.openingBalance.toLocaleString("he-IL", { minimumFractionDigits: 2 })}</td>
                <td className="border p-1 text-right">{s.principal.toLocaleString("he-IL", { minimumFractionDigits: 2 })}</td>
                <td className="border p-1 text-right">{s.interest.toLocaleString("he-IL", { minimumFractionDigits: 2 })}</td>
                <td className="border p-1 text-right">{s.payment.toLocaleString("he-IL", { minimumFractionDigits: 2 })}</td>
                <td className="border p-1 text-right">{s.closingBalance.toLocaleString("he-IL", { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100 font-bold">
            <tr>
              <td className="border p-1 text-center">סה"כ</td>
              <td className="border p-1"></td>
              <td className="border p-1">{result.schedule?.reduce((sum, s) => sum + s.principal, 0).toLocaleString("he-IL", { minimumFractionDigits: 2 })}</td>
              <td className="border p-1">{result.schedule?.reduce((sum, s) => sum + s.interest, 0).toLocaleString("he-IL", { minimumFractionDigits: 2 })}</td>
              <td className="border p-1">{result.totalPaid?.toLocaleString("he-IL", { minimumFractionDigits: 2 })}</td>
              <td className="border p-1"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}


























