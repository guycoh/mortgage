"use client";

import { useState, useEffect } from "react";

import LoanSummary from "./LoanSummary";



type Payment = {
  month: number;
  principal: number;
  interest: number;
  total: number;
  balance: number;
  indexedBalance: number;
  monthlyIndexRate: number;
};

export default function LoanSummaryPage() {
  const [principal, setPrincipal] = useState(100000);
  const [months, setMonths] = useState(12);
  const [annualRate, setAnnualRate] = useState(3);
  const [annualIndex, setAnnualIndex] = useState(3.6);
  const [isIndexLinked, setIsIndexLinked] = useState(false);

  const [schedule, setSchedule] = useState<Payment[]>([]);

  // חישוב אוטומטי בכל שינוי בפרמטרים
  useEffect(() => {
    const monthlyRate = annualRate / 12 / 100;
    const monthlyIndexRate = Math.pow(1 + annualIndex / 100, 1 / 12) - 1;

    let balance = principal;
    const payments: Payment[] = [];

    for (let i = 1; i <= months; i++) {
      if (isIndexLinked) {
        balance = balance * (1 + monthlyIndexRate); // עדכון יתרה למדד
      }

      const monthlyPayment =
        (balance * monthlyRate) /
        (1 - Math.pow(1 + monthlyRate, -(months - i + 1)));

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
        monthlyIndexRate,
      });
    }

    setSchedule(payments);
  }, [principal, months, annualRate, annualIndex, isIndexLinked]);

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white shadow rounded">
      <h1 className="text-2xl font-bold mb-4">סיכום הלוואה</h1>

      {/* טופס להזנת פרטים */}
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
          <label className="block font-medium">מדד שנתי %</label>
          <input
            type="number"
            value={annualIndex}
            onChange={(e) => setAnnualIndex(parseFloat(e.target.value))}
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
      </div>

      {/* הצגת הסיכום */}
      {schedule.length > 0 && (
        <LoanSummary payments={schedule} principal={principal} />
      )}
    </div>
  );
}
