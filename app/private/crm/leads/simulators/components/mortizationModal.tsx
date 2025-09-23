"use client";


import { calculateSpitzer , calculateEqualPrincipal, calculateBullet } from "./calculate/loanCalculators";

export type AmortizationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  loan?: any;
  path?: any;
  annualInflation?: number;
  isIndexed?: boolean;
  monthlyPayment?: number;
};

export default function AmortizationModal({
  isOpen,
  onClose,
  loan,
  path,
  isIndexed,
  annualInflation,
  monthlyPayment,
}: AmortizationModalProps) {
  if (!isOpen || !loan) return null;

  const loanType = loan.amortization_schedule_id;

  // חישוב הלוח המתאים
  let schedule: any[] = [];
  switch (loanType) {
    case 1: // שפיצר
      schedule = calculateSpitzer(loan);
      break;
    case 2: // קרן שווה
      schedule = calculateEqualPrincipal(loan);
      break;
    case 3: // בלון חלקי / מלא
    case 4:
      schedule = calculateBullet(loan);
      break;
    default:
      schedule = [];
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg w-[90%] max-w-4xl h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* כותרת */}
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="text-lg font-bold">לוח סילוקין</h2>
          <button
            onClick={onClose}
            className="text-red-600 font-bold px-2 py-1 hover:bg-red-100 rounded"
          >
            סגור
          </button>
        </div>

        {/* טבלה */}
        <div className="flex-1 overflow-y-auto p-4">
          {schedule.length > 0 ? (
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th>חודש</th>
                  <th>תשלום</th>
                  <th>קרן</th>
                  <th>ריבית</th>
                  <th>יתרה</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row, i) => (
                  <tr key={i} className="border-t">
                    <td>{row.month}</td>
                    <td>{row.payment.toFixed(2)}</td>
                    <td>{row.principal.toFixed(2)}</td>
                    <td>{row.interest.toFixed(2)}</td>
                    <td>{row.balance.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>לא נמצא לוח סילוקין מתאים</p>
          )}
        </div>
      </div>
    </div>
  );
}
