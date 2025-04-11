"use client";
import { useState } from "react";
import { useLoanContext } from "@/app/context/LoanContext";

interface LoanRow {
  amount: number;
  schedule: string;
  type: string;
  interest: number;
  term: number;
  endDate: string;
  grace: boolean;
  monthlyPayment: number;
}

export default function MortgageTable() {
  const { schedules, loanTypes } = useLoanContext();
  const [rows, setRows] = useState<LoanRow[]>([]);

  const calculateMonthlyPayment = (amount: number, annualInterest: number, months: number) => {
    if (annualInterest === 0) return amount / months;
    const monthlyInterest = annualInterest / 100 / 12;
    return (amount * monthlyInterest) / (1 - Math.pow(1 + monthlyInterest, -months));
  };

  const addRow = () => {
    setRows((prevRows) => [
      ...prevRows,
      { amount: 0, schedule: "", type: "", interest: 0, term: 0, endDate: "", grace: false, monthlyPayment: 0 },
    ]);
  };

  const updateRow = (index: number, field: keyof LoanRow, value: any) => {
    setRows((prevRows) => 
      prevRows.map((row, i) => {
        if (i === index) {
          const updatedRow = { ...row, [field]: value };
          if (field === "amount" || field === "interest" || field === "term") {
            updatedRow.monthlyPayment = calculateMonthlyPayment(updatedRow.amount, updatedRow.interest, updatedRow.term);
          }
          return updatedRow;
        }
        return row;
      })
    );
  };

  return (
    <div className="p-4">
      <button onClick={addRow} className="mb-4 border p-2 bg-gray-200">הוסף מסלול</button>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">סכום הלוואה</th>
            <th className="border p-2">לוח</th>
            <th className="border p-2">מסלול</th>
            <th className="border p-1 w-20">ריבית</th>
            <th className="border p-1 w-20">תקופה (חודשים)</th>
            <th className="border p-2">תאריך סיום</th>
            <th className="border p-2">גרייס</th>
            <th className="border p-2">תשלום חודשי</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border">
              <td className="border p-2"><input type="number" value={row.amount} onChange={(e) => updateRow(index, "amount", Number(e.target.value))} /></td>
              
              <td className="border p-2">
                <select value={row.schedule} onChange={(e) => updateRow(index, "schedule", e.target.value)}>
                  {schedules.map((schedule) => (
                    <option key={schedule.code} value={schedule.code}>{schedule.name}</option>
                  ))}
                </select>
              </td>
              
              <td className="border p-2">
                <select value={row.type} onChange={(e) => updateRow(index, "type", e.target.value)}>
                  {loanTypes.map((type) => (
                    <option key={type.code} value={type.code}>{type.name}</option>
                  ))}
                </select> 
              </td>
              <td className="border p-1 w-20"><input type="number" step="0.01" max="99.99" value={row.interest} onChange={(e) => updateRow(index, "interest", Number(e.target.value))} /></td>
              <td className="border p-1 w-20"><input type="number" max="999" value={row.term} onChange={(e) => updateRow(index, "term", Number(e.target.value))} /></td>
              <td className="border p-2"><input type="date" value={row.endDate} onChange={(e) => updateRow(index, "endDate", e.target.value)} /></td>
              <td className="border p-2 text-center"><input type="checkbox" checked={row.grace} onChange={(e) => updateRow(index, "grace", e.target.checked)} /></td>
              <td className="border p-2">{row.monthlyPayment.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
