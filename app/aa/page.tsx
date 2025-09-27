"use client"
import { useState } from "react";

type Payment = {
  month: number;
  principal: number;
  interest: number;
  total: number;
  balance: number;
  indexedBalance: number;
  monthlyIndexRate: number;
};

export default function LoanCalculator() {
  const [principal, setPrincipal] = useState(100000);
  const [months, setMonths] = useState(12);
  const [annualRate, setAnnualRate] = useState(3);
  const [isIndexLinked, setIsIndexLinked] = useState(false);
  const [annualIndex, setAnnualIndex] = useState(3.6); // אחוז שנתי
  const [schedule, setSchedule] = useState<Payment[]>([]);
  const [totalInterest, setTotalInterest] = useState(0);
  const [totalIndexation, setTotalIndexation] = useState(0);
  const [totalPayment, setTotalPayment] = useState(0);

  const calculateSchedule = () => {
    const monthlyRate = annualRate / 12 / 100;
    const monthlyIndexRate = Math.pow(1 + annualIndex / 100, 1 / 12) - 1;

    let balance = principal;
    const payments: Payment[] = [];

    for (let i = 1; i <= months; i++) {
      let balanceBeforePayment = balance;

      if (isIndexLinked) {
        balance = balance * (1 + monthlyIndexRate); // עדכון יתרת קרן לפי מדד
      }

      const monthlyPayment = (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months + i - 1));
      const interest = balance * monthlyRate;
      const principalPaid = monthlyPayment - interest;
      balance -= principalPaid;

      payments.push({
        month: i,
        principal: principalPaid,
        interest,
        total: monthlyPayment,
        balance: balance < 0 ? 0 : balance,
        indexedBalance: balance,
        monthlyIndexRate: monthlyIndexRate,
      });
    }

    setSchedule(payments);

    // חישוב סה"כ ריבית, הצמדה ותשלום
   // ...כל הקוד הקודם נשאר אותו דבר

// חישוב סה"כ ריבית + הצמדה
let interestSum = 0;
let indexSum = 0;

payments.forEach((p, idx) => {
  interestSum += p.interest;
  const prevBalance = idx === 0 ? principal : payments[idx - 1].balance;
  // ההצמדה היא ההבדל בין יתרת הקרן לאחר הצמדה לבין יתרת הקרן אחרי פירעון קרן
  indexSum += (p.indexedBalance - (prevBalance - p.principal));
});

setTotalInterest(interestSum);
setTotalIndexation(indexSum);
setTotalPayment(principal + interestSum + indexSum);

  
  
  
  
  
  
  
  
  };

  return (
    <div className="p-6 max-w-5xl mx-auto bg-white shadow rounded">
      <h2 className="text-2xl font-bold mb-4">מחשבון הלוואה</h2>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block font-medium">סכום הלוואה</label>
          <input
            type="number"
            value={principal}
            onChange={(e) => setPrincipal(parseFloat(e.target.value))}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block font-medium">מספר חודשים</label>
          <input
            type="number"
            value={months}
            onChange={(e) => setMonths(parseInt(e.target.value))}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block font-medium">ריבית שנתית %</label>
          <input
            type="number"
            value={annualRate}
            onChange={(e) => setAnnualRate(parseFloat(e.target.value))}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block font-medium">צמוד מדד?</label>
          <select
            value={isIndexLinked ? "yes" : "no"}
            onChange={(e) => setIsIndexLinked(e.target.value === "yes")}
            className="w-full p-2 border rounded"
          >
            <option value="no">לא צמוד</option>
            <option value="yes">צמוד</option>
          </select>
        </div>
        <div>
          <label className="block font-medium">מדד שנתי %</label>
          <input
            type="number"
            value={annualIndex}
            onChange={(e) => setAnnualIndex(parseFloat(e.target.value))}
            className="w-full p-2 border rounded"
          />
        </div>
      </div>

      <button
        onClick={calculateSchedule}
        className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
      >
        חשב לוח סילוקין
      </button>

      {schedule.length > 0 && (
        <>
          <div className="overflow-x-auto mt-6">
            <table className="w-full table-auto border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2">חודש</th>
                  <th className="border p-2">קרן</th>
                  <th className="border p-2">ריבית</th>
                  <th className="border p-2">תשלום חודשי</th>
                  <th className="border p-2">יתרה</th>
                  <th className="border p-2">יתרה לאחר מדד</th>
                  <th className="border p-2">מדד חודשי %</th>
                  <th className="border p-2">מדד שנתי %</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((p) => (
                  <tr key={p.month}>
                    <td className="border p-2 text-center">{p.month}</td>
                    <td className="border p-2 text-right">{p.principal.toFixed(2)}</td>
                    <td className="border p-2 text-right">{p.interest.toFixed(2)}</td>
                    <td className="border p-2 text-right">{p.total.toFixed(2)}</td>
                    <td className="border p-2 text-right">{p.balance.toFixed(2)}</td>
                    <td className="border p-2 text-right">{p.indexedBalance.toFixed(2)}</td>
                    <td className="border p-2 text-right">{(p.monthlyIndexRate * 100).toFixed(3)}%</td>
                    <td className="border p-2 text-right">{annualIndex.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-4 bg-gray-100 rounded">
            <p>סה״כ ריבית + הצמדה: <strong>{(totalInterest + totalIndexation).toFixed(2)} ₪</strong></p>
            <p>סה״כ לקרן: <strong>{principal.toFixed(2)} ₪</strong></p>
            <p>סה״כ לתשלום כולל: <strong>{totalPayment.toFixed(2)} ₪</strong></p>
          </div>

        </>
      )}
    </div>
  );
}