"use client"

import { useState } from 'react';

const MortgageCalculator = () => {
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [loanDeductions, setLoanDeductions] = useState<number>(0);
  const [equity, setEquity] = useState<number>(0);
  const [interestRate, setInterestRate] = useState<number>(4);
  const [loanAmount, setLoanAmount] = useState<number>(0);
  const [monthlyPayment, setMonthlyPayment] = useState<number>(0);
  const [maxPurchaseAmount, setMaxPurchaseAmount] = useState<number>(0);
  const [showResults, setShowResults] = useState<boolean>(false); // חדש

  const calculatedIncome = Math.max(totalIncome - loanDeductions, 0);

  const formatNumber = (num: number) => num.toLocaleString('he-IL');

  const calculateMortgage = () => {
    const maxMonthlyRepayment = calculatedIncome * 0.4;
    const loanTermMonths = 30 * 12;
    const monthlyInterestRate = Math.pow(1 + interestRate / 100, 1 / 12) - 1;
    const maxLoanAmount = maxMonthlyRepayment * ((Math.pow(1 + monthlyInterestRate, loanTermMonths) - 1) / (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, loanTermMonths)));
    const maxLoanBasedOnEquity = equity * 3;
    const finalLoanAmount = Math.min(maxLoanAmount, maxLoanBasedOnEquity);
    const finalMonthlyPayment = finalLoanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, loanTermMonths)) / (Math.pow(1 + monthlyInterestRate, loanTermMonths) - 1);
    const maxPurchase = finalLoanAmount + equity;

    setLoanAmount(Math.round(finalLoanAmount));
    setMonthlyPayment(Math.round(finalMonthlyPayment));
    setMaxPurchaseAmount(Math.round(maxPurchase));
    setShowResults(true); // מציג את הפלט לאחר חישוב
  };

  // פונקציה שמאפסת את הפלט כאשר משנים ערכים
  const handleInputChange = (setter: (value: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0);
    setShowResults(false); // הסתרת הפלט בעת שינוי קלט
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 ">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-lg my-5">
        <h1 className="text-2xl font-semibold text-center mb-6">מחשבון משכנתא מקסימלית</h1>
        <h1 className="text-lg font-semibold text-center mb-6"> מחושב לפי משכנתא ל 30 שנה </h1>
        <div className="mb-4">
          <label className="block text-sm font-medium">סך הכנסות לווים:</label>
          <input type="text" value={formatNumber(totalIncome)} onChange={handleInputChange(setTotalIncome)} className="border p-2 w-full rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:bg-orange-50   " />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium">סכום הלוואות עם מועד סיום מעל 18 חודש:</label>
          <input type="text" value={formatNumber(loanDeductions)} onChange={handleInputChange(setLoanDeductions)} className="border p-2 w-full rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:bg-orange-50  " />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium">הכנסה קובעת לחישוב משכנתא:</label>
          <p className="text-xl font-semibold">{formatNumber(calculatedIncome)} ₪</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium">הון עצמי:</label>
          <input type="text" value={formatNumber(equity)} onChange={handleInputChange(setEquity)} className="border p-2 w-full rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:bg-orange-50  " />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium">ריבית שנתית (%):</label>
          <input type="number" value={interestRate} onChange={(e) => { setInterestRate(Number(e.target.value)); setShowResults(false); }} className="border p-2 w-full rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:bg-orange-50" />
        </div>

        <button onClick={calculateMortgage} className="bg-blue-500 text-white p-3 w-full rounded-md hover:bg-blue-600 focus:ring-2 focus:ring-blue-500">
          חשב זכאות
        </button>

        {showResults && loanAmount > 0 && (
          <div className="mt-6 text-center">
            <h2 className="text-lg font-semibold">הסכום המקסימלי למשכנתא:</h2>
            <p className="text-xl">{formatNumber(loanAmount)} ₪</p>
          </div>
        )}

        {showResults && monthlyPayment > 0 && (
          <div className="mt-6 text-center">
            <h2 className="text-lg font-semibold">התשלום החודשי למשכנתא:</h2>
            <p className="text-xl">{formatNumber(monthlyPayment)} ₪</p>
          </div>
        )}

        {showResults && maxPurchaseAmount > 0 && (
          <div className="mt-6 text-center">
            <h2 className="text-lg font-semibold">סכום מקסימלי לרכישת נכס:</h2>
            <p className="text-xl">{formatNumber(maxPurchaseAmount)} ₪</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MortgageCalculator;
