//components/LoanAmortization.tsx
"use client"


export type LoanAmortizationProps = {
  isOpen: boolean;
  onClose: () => void;
  loan?: any; // יתקבל דרך props
  path?: any; // יתקבל דרך props
  annualInflation?: number;
  isIndexed?: boolean; // 👈 חדש
  monthlyPayment?: number; // ✨ חדש
};

export default function LoanAmortization({
  isOpen,
  onClose,
  loan,
  path,
  isIndexed, 
  annualInflation,
  monthlyPayment, // ✨ נקלט כאן
}: LoanAmortizationProps) {
  if (!isOpen) return null;

  //  משתנים לתחשיב
  const annualRateDecimal = loan.rate / 100; 
  const monthlyRateDecimal = annualRateDecimal / 12; 

  const annualInflationDecimal =
    isIndexed && annualInflation !== undefined
      ? parseFloat((annualInflation / 100).toFixed(4))
      : 0;

  const monthlyInflationDecimal =
    isIndexed && annualInflationDecimal > 0
      ? parseFloat((annualInflationDecimal / 12).toFixed(6))
      : 0;

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

        {/* תוכן המודל עם גלילה פנימית */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* מידע כללי */}
          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            {/* טור רגיל */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-1">
                <span>מסלול:</span>
                <span className="underline">{path?.name ?? "-"}</span>
              </div>
              <div className="flex gap-1">
                <span>Annual Inflation:</span>
                <span className="underline">{annualInflation ?? "-"}</span>
              </div>
              <div className="flex gap-1">
                <span>סכום ההלוואה:</span>
                <span className="underline">
                  {loan.amount.toLocaleString("he-IL")}
                </span>
              </div>
              <div className="flex gap-1">
                <span>מספר חודשים:</span>
                <span className="underline">{loan.months}</span>
              </div>
              <div className="flex gap-1">
                <span>ריבית:</span>
                <span className="underline">{loan.rate}%</span>
              </div>
            </div>

            {/* טור אדום */}
            <div className="hidden"> 
                <div className="flex flex-col gap-2 text-red-600">
                <div className="flex gap-1">
                    <span>Loan ID:</span>
                    <span className="underline">{loan?.id ?? "-"}</span>
                </div>
                <div className="flex gap-1">
                    <span>מספר תמהיל:</span>
                    <span className="underline">{loan.mix_id}</span>
                </div>
                <div className="flex gap-1">
                    <span>Path:</span>
                    <span className="underline">{path?.name ?? "-"}</span>
                </div>
                <div className="flex gap-1">
                    <span>indexed:</span>
                    <span className="underline">{isIndexed ? "כן" : "לא"}</span>
                </div>
                <div className="flex gap-1">
                    <span>annualRate:</span>
                    <span className="underline">{annualRateDecimal}</span>
                </div>
                <div className="flex gap-1">
                    <span>monthlyRate:</span>
                    <span className="underline">{monthlyRateDecimal}</span>
                </div>
                <div className="flex gap-1">
                    <span>annualInflation:</span>
                    <span className="underline">{annualInflationDecimal}</span>
                </div>
                <div className="flex gap-1">
                    <span>monthlyInflation:</span>
                    <span className="underline">{monthlyInflationDecimal}</span>
                </div>
                <div className="flex gap-1">
                    <span>monthlyPayment:</span>
                    <span className="underline">{monthlyPayment}</span>
                </div>
                <div className="flex gap-1">
                    <span>amount:</span>
                    <span className="underline">{loan.amount}</span>
                </div>





                </div>
            </div>
          
          
          </div>

          {/* לוח סילוקין */}
          <div>
            <h3 className="text-md font-bold mb-2">לוח סילוקין</h3>
            <div className="border rounded max-h-[40vh] overflow-y-auto">
      <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-gray-100">
                  <tr>
                    <th className="border p-2">חודש</th>
                    <th className="border p-2">י.פ</th>
                    <th className="border p-2">תשלום קרן</th>
                    <th className="border p-2">תשלום ריבית</th>
                    <th className="border p-2">מקדם אינפלציה</th>
                    <th className="border p-2">תשלום חודשי בפועל</th>
                    <th className="border p-2">י.ס</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let prevClosingBalance = loan.amount; // י.פ של החודש הראשון
                    let totalPrincipal = 0;
                    let totalInterest = 0;
                    let totalPayment = 0;

                    const rows = Array.from({ length: loan.months }, (_, i) => {
                      const month = i + 1;
                      const inflationFactor = Math.pow(1 + monthlyInflationDecimal, month);
                      const actualPayment = monthlyPayment
                        ? monthlyPayment * inflationFactor
                        : 0;

                      const yp = prevClosingBalance; // י.פ לחודש הנוכחי
                      const interestPayment = yp * monthlyRateDecimal * (1 + monthlyInflationDecimal);
                      const principalPayment = actualPayment - interestPayment;

                      const closingBalance = (yp * (1 + monthlyInflationDecimal)) - principalPayment; // י.ס
                      prevClosingBalance = closingBalance; // יעדכן את י.פ של החודש הבא

                      // סיכום
                      totalPrincipal += principalPayment;
                      totalInterest += interestPayment;
                      totalPayment += actualPayment;

                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="border p-2 text-center">{month}</td>
                          <td className="border p-2 text-center">{yp.toFixed(2)}</td>
                          <td className="border p-2 text-center">{principalPayment.toFixed(2)}</td>
                          <td className="border p-2 text-center">{interestPayment.toFixed(2)}</td>
                          <td className="border p-2 text-center">{inflationFactor.toFixed(6)}</td>
                          <td className="border p-2 text-center">{actualPayment.toFixed(2)}</td>
                          <td className="border p-2 text-center">{closingBalance.toFixed(2)}</td>
                        </tr>
                      );
                    });

                    return (
                      <>
                        {rows}
                        <tr className="bg-gray-200 font-bold">
                          <td className="border p-2 text-center" colSpan={2}>סך הכל</td>
                          <td className="border p-2 text-center">{totalPrincipal.toFixed(2)}</td>
                          <td className="border p-2 text-center">{totalInterest.toFixed(2)}</td>
                          <td className="border p-2 text-center">-</td>
                          <td className="border p-2 text-center">{totalPayment.toFixed(2)}</td>
                          <td className="border p-2 text-center">-</td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>



            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

































