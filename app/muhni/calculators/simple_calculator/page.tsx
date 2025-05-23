'use client';

import { useState } from 'react';

interface MonthlyData {
  month: number;
  principalPaid: number;
  interestPaid: number;
  totalPaid: number;
  remainingBalance: number;
}

export default function LoanCalculator() {
  const [amount, setAmount] = useState(100000);
  const [interest, setInterest] = useState(5);
  const [months, setMonths] = useState(120);

  const monthlyRate = interest / 100 / 12;
  const monthlyPayment =
    amount && monthlyRate
      ? (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months))
      : 0;

  const getMonthlyBreakdown = (): MonthlyData[] => {
    let balance = amount;
    const breakdown: MonthlyData[] = [];

    for (let m = 1; m <= months; m++) {
      const interestPart = balance * monthlyRate;
      const principalPart = monthlyPayment - interestPart;

      breakdown.push({
        month: m,
        interestPaid: interestPart,
        principalPaid: principalPart,
        totalPaid: interestPart + principalPart,
        remainingBalance: balance - principalPart,
      });

      balance -= principalPart;
      if (balance < 0) balance = 0;
    }

    return breakdown;
  };

  const breakdown = getMonthlyBreakdown();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-sky-100 flex flex-col items-center justify-center px-4 py-10 space-y-10">
      {/* מחשבון */}
      <div className="w-full max-w-md p-6 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-lg animate-fade-in-up">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">מחשבון הלוואה 💸</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">סכום ההלוואה (₪)</label>
            <input
              type="text"
              value={amount.toLocaleString()}
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, '');
                const num = Number(raw);
                if (!isNaN(num)) setAmount(num);
              }}
              onBlur={(e) => {
                const raw = e.target.value.replace(/,/g, '');
                const num = Number(raw);
                if (!isNaN(num)) e.target.value = num.toLocaleString();
              }}
              onFocus={(e) => {
                e.target.value = amount.toString();
              }}
              inputMode="numeric"
              className="w-full px-4 py-2 rounded-lg bg-white text-gray-800 border border-gray-300 focus:ring-2 focus:ring-sky-300"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">ריבית שנתית (%)</label>
            <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  value={interest.toString()}
                  onChange={(e) => {
                    const val = e.target.value.replace(',', '.');
                    const num = Number(val);
                    if (!isNaN(num)) setInterest(num);
                  }}
                className="w-full px-4 py-2 rounded-lg bg-white text-gray-800 border border-gray-300 focus:ring-2 focus:ring-sky-300"
              />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">מספר חודשי הלוואה</label>
            <input
              type="number"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="w-full px-4 py-2 rounded-lg bg-white text-gray-800 border border-gray-300 focus:ring-2 focus:ring-sky-300"
            />
          </div>

          <div className="mt-6 p-4 rounded-xl bg-sky-50 border border-sky-200 text-center">
            <p className="text-gray-700 text-lg">תשלום חודשי מוערך:</p>
            <p className="text-3xl font-semibold text-sky-600 mt-2">₪{monthlyPayment.toFixed(2)}</p>
          </div>
        </div>
      </div>


      

      {/* טבלה חודשית */}
      <div className="w-full max-w-4xl bg-white/70 p-6 rounded-xl shadow-md border border-slate-200 space-y-4">
        <h2 className="text-xl font-bold text-gray-700 mb-2">פירוט חודשי 🧾</h2>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm text-right text-gray-700">
            <thead className="text-xs text-gray-500 uppercase border-b">
              <tr>
                <th className="px-3 py-2">חודש</th>
                <th className="px-3 py-2">תשלום חודשי</th>
                <th className="px-3 py-2 text-rose-500">ריבית</th>
                <th className="px-3 py-2 text-emerald-600">קרן</th>
                <th className="px-3 py-2">יתרה</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((row) => (
                <tr key={row.month} className="border-b hover:bg-sky-50 transition">
                  <td className="px-3 py-2">{row.month}</td>
                  <td className="px-3 py-2">{row.totalPaid.toFixed(0)}</td>
                  <td className="px-3 py-2 text-rose-500">{row.interestPaid.toFixed(0)}</td>
                  <td className="px-3 py-2 text-emerald-600">{row.principalPaid.toFixed(0)}</td>
                  <td className="px-3 py-2">{row.remainingBalance.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
