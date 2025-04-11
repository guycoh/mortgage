"use client"
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
}

export default function MortgageTable() {
 
  const { schedules,loanTypes } = useLoanContext();

 
 
  const [rows, setRows] = useState<LoanRow[]>([]);

  const addRow = () => {
    setRows([
      ...rows,
      { amount: 0, schedule: "", type: "", interest: 0, term: 0, endDate: "", grace: false },
    ]);
  };

  const updateRow = (index: number, field: keyof LoanRow, value: any) => {
    setRows((prevRows) => 
      prevRows.map((row, i) => 
        i === index ? { ...row, [field]: value } : row
      )
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
            <th className="border p-2">ריבית</th>
            <th className="border p-2">תקופה (שנים)</th>
            <th className="border p-2">תאריך סיום</th>
            <th className="border p-2">גרייס</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border">
              <td className="border p-2"><input type="number" value={row.amount} onChange={(e) => updateRow(index, "amount", Number(e.target.value))} /></td>
              
              <td className="border p-2">
                           
                <select  value={row.schedule} onChange={(e) => updateRow(index, "schedule", e.target.value)}  >
                  {schedules.map((schedule) => (
                    <option key={schedule.code} value={schedule.code}>
                      {schedule.name}
                    </option>
                  ))}
                </select>
              </td>
              

              <td className="border p-2">
                
                <select  value={row.type} onChange={(e) => updateRow(index, "type", e.target.value)}  >
                  {loanTypes.map((type) => (
                    <option value={type.code}>
                      {type.name}
                    </option>
                  ))}
                </select> 
                
                </td>
              <td className="border p-2"><input type="number" step="0.01" value={row.interest} onChange={(e) => updateRow(index, "interest", Number(e.target.value))} /></td>
              <td className="border p-2"><input type="number" value={row.term} onChange={(e) => updateRow(index, "term", Number(e.target.value))} /></td>
              <td className="border p-2"><input type="date" value={row.endDate} onChange={(e) => updateRow(index, "endDate", e.target.value)} /></td>
              <td className="border p-2 text-center"><input type="checkbox" checked={row.grace} onChange={(e) => updateRow(index, "grace", e.target.checked)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
