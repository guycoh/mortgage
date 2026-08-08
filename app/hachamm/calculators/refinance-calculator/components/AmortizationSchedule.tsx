import React from "react";



interface AmortizationScheduleProps {
  loanAmount: number; // סכום ההלוואה
  monthlyInterestRate: number; // ריבית חודשית (במונחי שבר עשרוני)
  months: number; // מספר חודשים
  monthlyPayment: number; // תשלום חודשי
  inflationRate: number; // שיעור האינפלציה הצפוי (שנתי) במונחי שבר עשרוני
}

const AmortizationSchedule: React.FC<AmortizationScheduleProps> = ({
  loanAmount,
  monthlyInterestRate,
  months,
  monthlyPayment,
  inflationRate,
}) => {
  // אם אין פרטים, החזר הודעה ריקה
  if (!loanAmount || !monthlyInterestRate || !months || !monthlyPayment) {
    return <p className="text-gray-500">נתוני הלוואה חסרים</p>;
  }

  // חישוב לוח הסילוקין
  let balance = loanAmount;
  let baseIndex = 100; // מדד בסיס התחלתי
  const monthlyInflationRate = Math.pow(1 + inflationRate, 1 / 12) - 1; // שיעור אינפלציה חודשי
  const schedule = [];

  for (let i = 1; i <= months; i++) {
    const interestPayment = balance * monthlyInterestRate; // תשלום ריבית
    const principalPayment = monthlyPayment - interestPayment; // תשלום לקרן
    balance -= principalPayment; // עדכון יתרת החוב

    schedule.push({
      paymentNumber: i,
      monthlyPayment: monthlyPayment,
      interestPayment: interestPayment,
      principalPayment: principalPayment,
      balance: Math.max(balance, 0), // יתרה לא תעבור ל-שלילי
      baseIndex: baseIndex, // ערך מדד הבסיס
    });

    baseIndex *= 1 + monthlyInflationRate; // עדכון מדד הבסיס לחודש הבא

    if (balance <= 0) break; // עצור אם החוב שולם לגמרי
  }

  return (
    <div className="mt-4">
      <h3 className="text-lg font-bold mb-2 text-blue-600">לוח סילוקין</h3>
      <table className="w-full border-collapse border border-gray-300 text-right">
        <thead className="bg-gray-100">
          <tr>
            <th className="border border-gray-300 p-2">מספר תשלום</th>
            <th className="border border-gray-300 p-2">תשלום חודשי (₪)</th>
            <th className="border border-gray-300 p-2">תשלום ריבית (₪)</th>
            <th className="border border-gray-300 p-2">תשלום לקרן (₪)</th>
            <th className="border border-gray-300 p-2">יתרת החוב (₪)</th>
            <th className="border border-gray-300 p-2">מדד בסיס</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((row) => (
            <tr key={row.paymentNumber}>
              <td className="border border-gray-300 p-2">{row.paymentNumber}</td>
              <td className="border border-gray-300 p-2">
                {row.monthlyPayment.toFixed(2)}
              </td>
              <td className="border border-gray-300 p-2">
                {row.interestPayment.toFixed(2)}
              </td>
              <td className="border border-gray-300 p-2">
                {row.principalPayment.toFixed(2)}
              </td>
              <td className="border border-gray-300 p-2">
                {row.balance.toFixed(2)}
              </td>
              <td className="border border-gray-300 p-2">
                {row.baseIndex.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AmortizationSchedule;
