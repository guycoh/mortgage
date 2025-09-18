"use client";

import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

type Loan = {
  loan_end_date?: string | null; // נשמר כ־ISO string
  months?: number;
};

export default function TestDatePicker() {
  const [loan, setLoan] = useState<Loan>({
    loan_end_date: "2025-09-14", // דוגמה – מהDB
    months: 0,
  });

  const parseISODate = (dateString: string): Date | null => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

  return (
    <div className="p-4">
      <DatePicker
            selected={loan.loan_end_date ? parseISODate(loan.loan_end_date) : null}
            onChange={(date: Date | null) => {
                if (date) {
                const iso = date.toISOString().split("T")[0]; 
                setLoan({
                    loan_end_date: iso,
                    months: Math.ceil(
                    (date.getTime() - new Date().getTime()) /
                        (1000 * 60 * 60 * 24 * (365.25 / 12))
                    ),
                });
                } else {
                setLoan({ loan_end_date: null, months: 0 });
                }
            }}
            dateFormat="dd/MM/yyyy"   // מציג 14/09/2025
            placeholderText="בחר תאריך"
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            className="border rounded p-2 text-center"
            />

      <div className="mt-4 text-sm text-gray-700">
        <p>loan_end_date: {loan.loan_end_date}</p>
        <p>months: {loan.months}</p>
      </div>
    </div>
  );
}
