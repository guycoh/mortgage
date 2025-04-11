"use client"

import { useState } from 'react';

const MortgageCalculator = () => {
  const [totalIncome, setTotalIncome] = useState<number>(0); // סך הכנסות לווים
  const [loanDeductions, setLoanDeductions] = useState<number>(0); // סכום ההלוואות שיקוזז
  const [equity, setEquity] = useState<number>(0); // הון עצמי
  const [interestRate, setInterestRate] = useState<number>(4); // ריבית שנתית
  const [loanAmount, setLoanAmount] = useState<number>(0); // סכום המשכנתא
  const [monthlyPayment, setMonthlyPayment] = useState<number>(0); // תשלום חודשי
  const [maxPurchaseAmount, setMaxPurchaseAmount] = useState<number>(0); // סכום מקסימלי לרכישת נכס

  // חישוב הכנסה קובעת לאחר הפחתת ההלוואות
  const calculatedIncome = Math.max(totalIncome - loanDeductions, 0);

  // פונקציה להמיר מספרים עם מפריד אלפים
  const formatNumber = (num: number) => num.toLocaleString('he-IL');

  const calculateMortgage = () => {
    const maxMonthlyRepayment = calculatedIncome * 0.4; // 40% מההכנסה הקובעת
    const loanTermMonths = 30 * 12; // 30 שנים
    const monthlyInterestRate = Math.pow(1 + interestRate / 100, 1 / 12) - 1;
  


    const maxLoanAmount = maxMonthlyRepayment * ((Math.pow(1 + monthlyInterestRate, loanTermMonths) - 1) / (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, loanTermMonths)));
    const maxLoanBasedOnEquity = equity * 3;
    const finalLoanAmount = Math.min(maxLoanAmount, maxLoanBasedOnEquity);
    const finalMonthlyPayment = Math.min(maxMonthlyRepayment, finalLoanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, loanTermMonths)) / (Math.pow(1 + monthlyInterestRate, loanTermMonths) - 1));
    const maxPurchase = finalLoanAmount + equity;

    setLoanAmount(Math.round(finalLoanAmount));
    setMonthlyPayment(Math.round(finalMonthlyPayment));
    setMaxPurchaseAmount(Math.round(maxPurchase));
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-lg">
        <h1 className="text-2xl font-semibold text-center mb-6">מחשבון זכאות למשכנתא</h1>

        <div className="mb-4">
          <label htmlFor="totalIncome" className="block text-sm font-medium">סך הכנסות לווים:</label>
          <input
            type="text"
            id="totalIncome"
            value={formatNumber(totalIncome)}
            onChange={(e) => setTotalIncome(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
            className="border p-2 w-full rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="loanDeductions" className="block text-sm font-medium">סכום הלוואות עם מועד סיום מעל 18 חודש:</label>
          <input
            type="text"
            id="loanDeductions"
            value={formatNumber(loanDeductions)}
            onChange={(e) => setLoanDeductions(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
            className="border p-2 w-full rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium">הכנסה קובעת לחישוב משכנתא:</label>
          <p className="text-xl font-semibold">{formatNumber(calculatedIncome)} ₪</p>
        </div>

        <div className="mb-4">
          <label htmlFor="equity" className="block text-sm font-medium">הון עצמי:</label>
          <input
            type="text"
            id="equity"
            value={formatNumber(equity)}
            onChange={(e) => setEquity(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
            className="border p-2 w-full rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="interestRate" className="block text-sm font-medium">ריבית שנתית (%):</label>
          <input
            type="number"
            id="interestRate"
            value={interestRate}
            onChange={(e) => setInterestRate(Number(e.target.value))}
            className="border p-2 w-full rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={calculateMortgage}
          className="bg-blue-500 text-white p-3 w-full rounded-md hover:bg-blue-600 focus:ring-2 focus:ring-blue-500"
        >
          חשב זכאות
        </button>
        
        {loanAmount > 0 && (
          <div className="mt-6 text-center">
            <h2 className="text-lg font-semibold">הסכום המקסימלי למשכנתא:</h2>
            <p className="text-xl">{formatNumber(loanAmount)} ₪</p>
          </div>
        )}

        {monthlyPayment > 0 && (
          <div className="mt-6 text-center">
            <h2 className="text-lg font-semibold">התשלום החודשי למשכנתא:</h2>
            <p className="text-xl">{formatNumber(monthlyPayment)} ₪</p>
          </div>
        )}

        {maxPurchaseAmount > 0 && (
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