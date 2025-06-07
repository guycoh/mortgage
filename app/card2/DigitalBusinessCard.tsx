"use client"
import { useState } from "react";

export default function BalloonLoanCalculator() {
  const [loanAmount, setLoanAmount] = useState(200000);
  const [annualRate, setAnnualRate] = useState(5.0);
  const [periodMonths, setPeriodMonths] = useState(24);
  const [inflationRate, setInflationRate] = useState(0);
  const [isLinked, setIsLinked] = useState(false);

  const monthlyRate = (1 + annualRate / 100) ** (1 / 12) - 1;
  const monthlyInflation = isLinked
    ? (1 + inflationRate / 100) ** (1 / 12) - 1
    : 0;

  const rows = Array.from({ length: periodMonths }, (_, i) => {
    const month = i + 1;
    const inflationFactor = (1 + monthlyInflation) ** i;
    const adjustedPrincipal = loanAmount * inflationFactor;
    const interestPayment = adjustedPrincipal * monthlyRate;
    const balloonPayment = month === periodMonths ? adjustedPrincipal : 0;
    const totalPayment = interestPayment + balloonPayment;

    return {
      month,
      interest: interestPayment,
      balloon: balloonPayment,
      total: totalPayment,
      balance: balloonPayment ? 0 : adjustedPrincipal,
    };
  });

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center text-orange-600">מחשבון הלוואת בלון מלא</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <label className="flex flex-col">
          <span className="mb-1 font-medium">
            סכום הלוואה: <span className="text-orange-600">{loanAmount.toLocaleString()} ₪</span>
          </span>
          <input
            type="range"
            min={10000}
            max={1000000}
            step={1000}
            value={loanAmount}
            onChange={(e) => setLoanAmount(+e.target.value)}
            className="w-full accent-orange-500 focus:bg-orange-50"
          />
        </label>

        <label className="flex flex-col">
          <span className="mb-1 font-medium">
            ריבית שנתית: <span className="text-orange-600">{annualRate.toFixed(2)}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={15}
            step={0.1}
            value={annualRate}
            onChange={(e) => setAnnualRate(+e.target.value)}
            className="w-full accent-orange-500 focus:bg-orange-50"
          />
        </label>

        <label className="flex flex-col">
          <span className="mb-1 font-medium">
            תקופה: <span className="text-orange-600">{periodMonths} חודשים</span>
          </span>
          <input
            type="range"
            min={6}
            max={360}
            step={6}
            value={periodMonths}
            onChange={(e) => setPeriodMonths(+e.target.value)}
            className="w-full accent-orange-500 focus:bg-orange-50"
          />
        </label>

        <label className="flex flex-col">
          <span className="mb-2 font-medium">האם ההלוואה צמודה למדד?</span>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isLinked}
              onChange={(e) => setIsLinked(e.target.checked)}
              className="w-5 h-5 accent-orange-500"
            />
            <span>{isLinked ? "כן" : "לא"}</span>
          </div>
          {isLinked && (
            <input
              type="number"
              placeholder="מדד שנתי צפוי (%)"
              value={inflationRate}
              onChange={(e) => setInflationRate(+e.target.value)}
              className="mt-2 w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          )}
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-gray-100 text-right">
              <th className="p-2 border">חודש</th>
              <th className="p-2 border">תשלום ריבית</th>
              <th className="p-2 border">תשלום קרן (בלון)</th>
              <th className="p-2 border">סה"כ תשלום</th>
              <th className="p-2 border">יתרת קרן</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month} className="text-right">
                <td className="p-2 border">{row.month}</td>
                <td className="p-2 border">{row.interest.toFixed(2)} ₪</td>
                <td className="p-2 border">
                  {row.balloon ? row.balloon.toFixed(2) + " ₪" : "-"}
                </td>
                <td className="p-2 border">{row.total.toFixed(2)} ₪</td>
                <td className="p-2 border">{row.balance.toFixed(2)} ₪</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}






















