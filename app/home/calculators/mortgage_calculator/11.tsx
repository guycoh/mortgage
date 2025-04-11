"use client"

import { useState } from "react";



export default  function MortgageCalculator(){
  
    

 const [rows, setRows] = useState([
    { loanAmount: 0, annualRate: 0, months: 0, plan: "" },
  ]);

  const addRow = () => {
    setRows([...rows, { loanAmount: 0, annualRate: 0, months: 0, plan: "" }]);
  };

  const updateRow = (index: number, field: string, value: string | number) => {
    const updatedRows = rows.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    );
    setRows(updatedRows);
  };







  const calculateMonthlyPayment = (
    loanAmount: number,
    annualRate: number,
    months: number
  ): number => {
    if (!loanAmount || !annualRate || !months) return 0;

    const monthlyRate = annualRate / 100 / 12; // ריבית חודשית
    return (
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1)
    );
  };

  const totalMonthlyPayment = rows.reduce(
    (sum, row) =>
      sum + calculateMonthlyPayment(row.loanAmount, row.annualRate, row.months),
    0


  );

  const totalLoanAmount = rows.reduce((sum, row) => sum + row.loanAmount, 0);

return(
<>

<div className="p-4 text-[#4a473e]">
      <h1 className="text-2xl font-bold mb-4 text-[#4a473e]">מחשבון מורגי משכנתא</h1>
      <button
        onClick={addRow}
        className="my-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        הוסף מסלול
      </button>
      <table className="table-auto w-full border-collapse border border-gray-300">
        <thead>
          <tr>
            <th className="border border-gray-300 px-4 py-2">סכום הלוואה</th>
            <th className="border border-gray-300 px-4 py-2">ריבית שנתית (%)</th>
            <th className="border border-gray-300 px-4 py-2">תקופה (חודשים)</th>
            <th className="border border-gray-300 px-4 py-2">מסלול</th>
            <th className="border border-gray-300 px-4 py-2">תשלום חודשי</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td className="border border-gray-300 px-4 py-2">
                <input
                  type="number"
                  value={row.loanAmount}
                  onChange={(e) =>
                    updateRow(index, "loanAmount", +e.target.value)
                  }
                  className="border p-1 w-full [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none "
                />
              </td>
              <td className="border border-gray-300 px-4 py-2">
                <input

                  type="number"
                  step="0.01"
                  value={row.annualRate}
                  onChange={(e) =>
                    updateRow(index, "annualRate", +e.target.value)
                  }
                  className="border p-1 w-full  [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none    "
                />
              </td>
              <td className="border border-gray-300 px-4 py-2">
                <input
                  type="number"
                  value={row.months}
                  onChange={(e) => updateRow(index, "months", +e.target.value)}
                  className="border p-1 w-full"
                />
              </td>
              <td className="border border-gray-300 px-4 py-2">
                <input
                  type="text"
                  value={row.plan}
                  onChange={(e) => updateRow(index, "plan", e.target.value)}
                  className="border p-1 w-full"
                />
              </td>
              <td className="border border-gray-300 px-4 py-2 text-center">
                {calculateMonthlyPayment(
                  row.loanAmount,
                  row.annualRate,
                  row.months
                ).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4">
        <h2 className="text-xl font-semibold">סיכום:</h2>
        <p className="mt-2">
          <strong>סה"כ תשלומים חודשיים:</strong>{" "}
          {totalMonthlyPayment.toFixed(2)} ₪
        </p>
        <p>
          <strong>סה"כ סכום ההלוואות:</strong> {totalLoanAmount.toFixed(2)} ₪
        </p>
      </div>

    </div>





</>



);



}