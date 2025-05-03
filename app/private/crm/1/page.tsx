"use client"

import { useState, useEffect } from "react";




export default function LoanCalculator({}) {
  const [amount, setAmount] = useState<number>(100000);
  const [annualRate, setAnnualRate] = useState<number>(5);
  const [months, setMonths] = useState<number>(60);
  const [monthlyPayment, setMonthlyPayment] = useState<number>(0);

  const calculatePayment = () => {
    if (amount <= 0 || months <= 0) {
      setMonthlyPayment(0);
      return;
    }
    const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
    let payment;
    if (monthlyRate === 0) {
      payment = amount / months;
    } else {
      payment = (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
    }
    setMonthlyPayment(payment > 0 ? payment : 0);
  };

  const formatAmount = (value: number): string => {
    return new Intl.NumberFormat("he-IL").format(value);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, ""); // remove commas
    const numericValue = Number(rawValue);
    if (!isNaN(numericValue)) {
      setAmount(numericValue);
    }
  };

  // useEffect to calculate payment automatically when any input changes
  useEffect(() => {
    calculatePayment();
  }, [amount, annualRate, months]); // Re-run calculation whenever any of these values change

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-xl font-bold text-center">מחשבון הלוואה</h2>
      <label className="block">
        סכום הלוואה:
        <input
          type="text"
          value={formatAmount(amount)}
          onChange={handleAmountChange}
          className="block w-full mt-1 p-2 border rounded"
        />
      </label>
      <label className="block">
        ריבית שנתית (%):
        <input
          type="number"
          value={annualRate}
          onChange={(e) => setAnnualRate(Number(e.target.value) || 0)}
          className="block w-full mt-1 p-2 border rounded"
        />
      </label>
      <label className="block">
        תקופה (חודשים):
        <input
          type="number"
          value={months}
          onChange={(e) => setMonths(Number(e.target.value) || 0)}
          className="block w-full mt-1 p-2 border rounded"
        />
      </label>
      {monthlyPayment > 0 && (
        <p className="text-lg font-bold text-center mt-4">
          תשלום חודשי: ₪{monthlyPayment.toFixed(2)}
        </p>
      )}
    </div>
  );
}
