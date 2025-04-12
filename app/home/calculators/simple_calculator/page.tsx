'use client';

import { useState } from 'react';

interface YearlyData {
  year: number;
  principalPaid: number;
  interestPaid: number;
  totalPaid: number;
}

export default function LoanCalculator() {
  const [amount, setAmount] = useState(100000);
  const [interest, setInterest] = useState(5);
  const [years, setYears] = useState(10);

  const monthlyRate = interest / 100 / 12;
  const numberOfPayments = years * 12;

  const monthlyPayment = amount
    ? (amount * monthlyRate) /
      (1 - Math.pow(1 + monthlyRate, -numberOfPayments))
    : 0;

  const getBreakdown = (): YearlyData[] => {
    let balance = amount;
    const breakdown: YearlyData[] = [];

    for (let y = 1; y <= years; y++) {
      let interestPaid = 0;
      let principalPaid = 0;

      for (let m = 0; m < 12; m++) {
        if (balance <= 0) break;

        const interestPart = balance * monthlyRate;
        const principalPart = monthlyPayment - interestPart;

        interestPaid += interestPart;
        principalPaid += principalPart;

        balance -= principalPart;
      }

      breakdown.push({
        year: y,
        interestPaid,
        principalPaid,
        totalPaid: interestPaid + principalPaid,
      });
    }

    return breakdown;
  };

  const yearlyBreakdown = getBreakdown();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-sky-100 flex flex-col items-center justify-center px-4 py-10 space-y-10">
      {/* מחשבון */}
      <div className="w-full max-w-md p-6 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-lg animate-fade-in-up">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          מחשבון הלוואה 💸
        </h1>

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
                e.target.value = amount.toString(); // ללא פסיקים בזמן עריכה
              }}
              inputMode="numeric"
              className="w-full px-4 py-2 rounded-lg bg-white text-gray-800 border border-gray-300 focus:ring-2 focus:ring-sky-300 appearance-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">ריבית שנתית (%)</label>
            <input
              type="number"
              step="0.1"
              value={interest}
              onChange={(e) => setInterest(Number(e.target.value))}
              className="w-full px-4 py-2 rounded-lg bg-white text-gray-800 border border-gray-300 focus:ring-2 focus:ring-sky-300 appearance-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">מספר שנים</label>
            <input
              type="number"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full px-4 py-2 rounded-lg bg-white text-gray-800 border border-gray-300 focus:ring-2 focus:ring-sky-300 appearance-none"
            />
          </div>

          <div className="mt-6 p-4 rounded-xl bg-sky-50 border border-sky-200 text-center">
            <p className="text-gray-700 text-lg">תשלום חודשי מוערך:</p>
            <p className="text-3xl font-semibold text-sky-600 mt-2">₪{monthlyPayment.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* לוח שנתי מדויק */}
      <div className="w-full max-w-3xl bg-white/70 p-6 rounded-xl shadow-md border border-slate-200 space-y-4">
        <h2 className="text-xl font-bold text-gray-700 mb-2">פירוט שנתי מדויק 🧾</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right rtl:text-right text-gray-700">
            <thead className="text-xs text-gray-500 uppercase border-b">
              <tr>
                <th className="px-3 py-2">שנה</th>
                <th className="px-3 py-2">תשלום כולל</th>
                <th className="px-3 py-2">ריבית</th>
                <th className="px-3 py-2">קרן</th>
              </tr>
            </thead>
            <tbody>
              {yearlyBreakdown.map((row) => (
                <tr key={row.year} className="border-b hover:bg-sky-50 transition">
                  <td className="px-3 py-2">{row.year}</td>
                  <td className="px-3 py-2">{row.totalPaid.toFixed(0)}</td>
                  <td className="px-3 py-2 text-rose-500">{row.interestPaid.toFixed(0)}</td>
                  <td className="px-3 py-2 text-emerald-600">{row.principalPaid.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
