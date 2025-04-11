"use client"

import React, { useState } from "react";

interface LoanRow {
  id: number;
  loanAmount: number;
  annualInterestRate: number;
  monthlyInterestRate: number;
  months: number;
  endDate: string;
  monthlyPayment: number;
  loanType: string;
}

const LoanTable2 = () => {
  const [rows, setRows] = useState<LoanRow[]>([]);

  const loanTypes = ["פריים", "קל\"צ", "ק\"צ", "משתנה"];

  const formatNumber = (num: number) => {
    return num.toLocaleString("he-IL");
  };

  const parseNumber = (str: string) => {
    return parseFloat(str.replace(/,/g, "")) || 0;
  };

  // פונקציה לחישוב ריבית חודשית לפי ריבית דה ריבית
  const calculateMonthlyInterestRate = (annualRate: number): number => {
    return Math.pow(1 + annualRate / 100, 1 / 12) - 1;
  };

  const calculateMonths = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const differenceInMonths =
      (end.getFullYear() - today.getFullYear()) * 12 +
      (end.getMonth() - today.getMonth());
    return differenceInMonths > 0 ? differenceInMonths : 0;
  };

  const addRow = () => {
    setRows([
      ...rows,
      {
        id: Date.now(),
        loanAmount: 0,
        annualInterestRate: 0,
        monthlyInterestRate: 0,
        months: 0,
        endDate: "",
        monthlyPayment: 0,
        loanType: loanTypes[0],
      },
    ]);
  };

  const updateRow = (id: number, field: keyof LoanRow, value: any) => {
    const updatedRows = rows.map((row) => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value };

        // חישוב ריבית חודשית חדשה לפי ריבית שנתית
        if (field === "annualInterestRate") {
          updatedRow.monthlyInterestRate = calculateMonthlyInterestRate(value);
        }

        // חישוב מספר חודשים מתאריך סיום
        if (field === "endDate") {
          updatedRow.months = calculateMonths(value);
        }

        // חישוב תשלום חודשי
        if (
          (field === "loanAmount" ||
            field === "annualInterestRate" ||
            field === "months") &&
          updatedRow.loanAmount > 0 &&
          updatedRow.monthlyInterestRate > 0 &&
          updatedRow.months > 0
        ) {
          const { loanAmount, monthlyInterestRate, months } = updatedRow;
          updatedRow.monthlyPayment = parseFloat(
            (
              (loanAmount * monthlyInterestRate) /
              (1 - Math.pow(1 + monthlyInterestRate, -months))
            ).toFixed(2)
          );
        }

        return updatedRow;
      }
      return row;
    });
    setRows(updatedRows);
  };

  const deleteRow = (id: number) => {
    setRows(rows.filter((row) => row.id !== id));
  };

  const totalLoanAmount = rows.reduce((sum, row) => sum + row.loanAmount, 0);
  const totalMonthlyPayment = rows.reduce(
    (sum, row) => sum + row.monthlyPayment,
    0
  );

  const todayDate = new Date().toISOString().split("T")[0]; // תאריך היום בפורמט YYYY-MM-DD

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold text-blue-600 mb-4"> ד"ר מורגי כדאיות מיחזור  </h1>
       
        {/* כפתור מסלול חדש */}
        <div className="mb-4 text-right">
          
          <button
            onClick={addRow}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            הוסף מסלול חדש
          </button>
        </div>

        {/* טבלה */}
        <table className="w-full border-collapse border border-gray-300 text-right">
          <thead className="bg-blue-50">
            <tr>
              <th className="border border-gray-300 p-2">סכום ההלוואה (₪)</th>
              <th className="border border-gray-300 p-2">מסלול הלוואה</th>
              <th className="border border-gray-300 p-2">ריבית שנתית (%)</th>
              <th className="border border-gray-300 p-2">ריבית חודשית (%)</th>
              <th className="border border-gray-300 p-2">תאריך סיום הלוואה</th>
              <th className="border border-gray-300 p-2">מספר חודשים</th>
              <th className="border border-gray-300 p-2">תשלום חודשי (₪)</th>
              <th className="border border-gray-300 p-2">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="border border-gray-300 p-2">
                  <input
                    type="text"
                    className="w-full border rounded px-2 py-1"
                    value={formatNumber(row.loanAmount)}
                    onChange={(e) =>
                      updateRow(
                        row.id,
                        "loanAmount",
                        parseNumber(e.target.value)
                      )
                    }
                  />
                </td>
                <td className="border border-gray-300 p-2">
                  <select
                    className="w-full border rounded px-2 py-1"
                    value={row.loanType}
                    onChange={(e) =>
                      updateRow(row.id, "loanType", e.target.value)
                    }
                  >
                    {loanTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border border-gray-300 p-2">
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border rounded px-2 py-1"
                    value={row.annualInterestRate}
                    onChange={(e) =>
                      updateRow(
                        row.id,
                        "annualInterestRate",
                        parseFloat(e.target.value)
                      )
                    }
                  />
                </td>
                <td className="border border-gray-300 p-2">
                  <input
                    type="number"
                    step="0.00001"
                    className="w-full border rounded px-2 py-1"
                    value={(row.monthlyInterestRate * 100).toFixed(5)}
                    disabled
                  />
                </td>
                <td className="border border-gray-300 p-2">
                  <input
                    type="date"
                    className="w-full border rounded px-2 py-1"
                    min={todayDate}
                    value={row.endDate}
                    onChange={(e) =>
                      updateRow(row.id, "endDate", e.target.value)
                    }
                  />
                </td>
                <td className="border border-gray-300 p-2">
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1"
                    value={row.months}
                    onChange={(e) =>
                      updateRow(row.id, "months", parseInt(e.target.value))
                    }
                  />
                </td>
                <td className="border border-gray-300 p-2">
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1"
                    value={row.monthlyPayment}
                    disabled
                  />
                </td>
                <td className="border border-gray-300 p-2">
                  <button
                    className="text-red-500 hover:underline"
                    onClick={() => deleteRow(row.id)}
                  >
                    מחק
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100">
            <tr>
              <td className="border border-gray-300 p-2 font-bold">
                סך הכול: {formatNumber(totalLoanAmount)} ₪
              </td>
              <td className="border border-gray-300 p-2"></td>
              <td className="border border-gray-300 p-2"></td>
              <td className="border border-gray-300 p-2"></td>
              <td className="border border-gray-300 p-2"></td>
              <td className="border border-gray-300 p-2"></td>
              <td className="border border-gray-300 p-2 font-bold">
          
                סך התשלום החודשי: {formatNumber(Number(totalMonthlyPayment.toFixed(2)))} ₪

              </td>
              <td className="border border-gray-300 p-2"></td>
            </tr>
          </tfoot>
        </table>
              
              <div className="flex justify-center"   >
                <button
           
                  className="bg-green-500 mt-3 text-white px-6 py-2 rounded hover:bg-green-600"
                >
                  בדיקת כדאיות מחזור
                </button>
                </div>
      </div>
    </div>
  );
};

export default LoanTable2;


