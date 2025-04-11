"use client"
import React, { useState } from "react";
import AmortizationSchedule from "./components/AmortizationSchedule";
import { Modal } from "./components/Modal";

interface LoanRow {
  id: number;
  loanAmount: number;
  annualInterestRate: number;
  monthlyInterestRate: number;
  months: number;
  endDate: string;
  monthlyPayment: number;
  loanType: string;
  isIndexed: boolean; // שדה לציון אם המסלול צמוד
  showSchedule: boolean;
}

const LoanTable4 = () => {
  const [rows, setRows] = useState<LoanRow[]>([]);
  const [openModal, setOpenModal] = useState<LoanRow | null>(null); // שורה פתוחה

  const loanTypes = [
    { code: 1, name: "פריים", isIndexed: false },
    { code: 2, name: "קבוע לא צמוד", isIndexed: false },
    { code: 3, name: "קבוע צמוד", isIndexed: true },
    { code: 11, name: "משתנה צמודה כל שנה", isIndexed: true },
    { code: 12, name: "משתנה צמודה כל 2.5", isIndexed: true },
    { code: 13, name: "משתנה צמודה כל 3", isIndexed: true },
    { code: 14, name: "משתנה צמודה כל 5", isIndexed: true },
    { code: 15, name: "משתנה צמודה כל 7", isIndexed: true },
    { code: 16, name: "משתנה צמודה כל 10", isIndexed: true },
    { code: 21, name: "משתנה לא צמוד כל שנה", isIndexed: false },
    { code: 22, name: "משתנה לא צמוד כל 2.5", isIndexed: false },
    { code: 23, name: "משתנה לא צמוד כל 3", isIndexed: false },
    { code: 24, name: "משתנה לא צמוד כל 5", isIndexed: false },
    { code: 25, name: "משתנה לא צמוד כל 7", isIndexed: false },
    { code: 26, name: "משתנה לא צמוד כל 10", isIndexed: false },
    { code: 27, name: "עוגן מק", isIndexed: false },
    { code: 31, name: "דולר", isIndexed: false },
    { code: 32, name: "יורו", isIndexed: false },
  ];

  const formatNumber = (num: number) => {
    return num.toLocaleString("he-IL");
  };

  const parseNumber = (str: string) => {
    return parseFloat(str.replace(/,/g, "")) || 0;
  };

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
        loanType: loanTypes[0].name,
        isIndexed: loanTypes[0].isIndexed,
        showSchedule: false,
      },
    ]);
  };

  const updateRow = (id: number, field: keyof LoanRow, value: any) => {
    const updatedRows = rows.map((row) => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value };

        if (field === "annualInterestRate") {
          updatedRow.monthlyInterestRate = calculateMonthlyInterestRate(value);
        }

        if (field === "endDate") {
          updatedRow.months = calculateMonths(value);
        }

        if (
          (field === "loanAmount" ||
            field === "annualInterestRate" ||
            field === "months" ||
            field === "endDate") &&
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

  const todayDate = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-gray-100 p-3">
      <div className="max-w-full mx-auto bg-white shadow-md rounded-lg p-2">
        <h1 className="text-2xl font-bold text-blue-600 mb-4">
          ד"ר מורגי כדאיות מיחזור
        </h1>
        <div className="mb-4 text-right flex items-center gap-4">
          <button
            onClick={addRow}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            הוסף מסלול חדש
          </button>

          <div className="flex items-center gap-2">
            <label htmlFor="expectedIndex" className="text-sm text-gray-600">
              מדד ממוצע צפוי:
            </label>
            <input
              type="text"
              value="2.8"
              readOnly
              className="w-20 border border-gray-300 rounded px-2 py-1 bg-gray-100 text-gray-600 text-center"
            />
          </div>
        </div>

        <table className="w-full border-collapse border border-gray-300 text-right">
          <thead className="bg-blue-50">
            <tr>
              <th className="border border-gray-300 p-2">סכום ההלוואה (₪)</th>
              <th className="border border-gray-300 p-2 w-[150px]">
                מסלול הלוואה
              </th>
              <th className="border border-gray-300 p-2">ריבית שנתית (%)</th>
              <th className="border border-gray-300 p-2 hidden">
                ריבית חודשית (%)
              </th>
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

                <td className="border border-gray-300 p-2 w-1/6">
                <select
                className="w-full border rounded px-2 py-1"
                value={row.loanType}
                onChange={(e) => {
                    const loanTypeName = e.target.value; // שם המסלול שנבחר
                    const selectedLoan = loanTypes.find(
                    (type) => type.name === loanTypeName
                    ); // חפש את המסלול המתאים
                    if (selectedLoan) {
                    // עדכון המסלול ושדה הצמוד
                    updateRow(row.id, "loanType", selectedLoan.name);
                    updateRow(row.id, "isIndexed", selectedLoan.isIndexed);
                    }
                }}
                >
                {loanTypes
                    .sort((a, b) => a.code - b.code) // מיון לפי קוד מסלול
                    .map((loanType) => (
                    <option key={loanType.code} value={loanType.name}>
                        {loanType.name}
                    </option>
                    ))}
                </select>
                </td>

                <td className="border border-gray-300 p-2">
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1"
                    value={row.annualInterestRate}
                    onChange={(e) =>
                      updateRow(row.id, "annualInterestRate", parseFloat(e.target.value))
                    }
                  />
                </td>

                <td className="border border-gray-300 p-2 hidden">
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
                    className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    onClick={() => setOpenModal(row)}
                  >
                    סילוקין
                  </button>
                </td>

                <td className="border border-gray-300 p-2">
                  <button
                    className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
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
              <td className="border border-gray-300 p-2 hidden"></td>
              <td className="border border-gray-300 p-2"></td>
              <td className="border border-gray-300 p-2"></td>
              <td className="border border-gray-300 p-2 font-bold">
                סך התשלום החודשי:{" "}
                {formatNumber(Number(totalMonthlyPayment.toFixed(2)))} ₪
              </td>
              <td className="border border-gray-300 p-2"></td>
            </tr>
          </tfoot>
        </table>

        <div className="flex justify-center">
          <button className="bg-green-500 mt-3 text-white px-6 py-2 rounded hover:bg-green-600">
            בדיקת כדאיות מחזור
          </button>
        </div>
      </div>

      <Modal isOpen={!!openModal} onClose={() => setOpenModal(null)}>
        {openModal && (
          <AmortizationSchedule
            loanAmount={openModal.loanAmount}
            monthlyInterestRate={openModal.monthlyInterestRate}
            months={openModal.months}
            monthlyPayment={openModal.monthlyPayment}
          />
        )}
      </Modal>
    </div>
  );
};

export default LoanTable4;
