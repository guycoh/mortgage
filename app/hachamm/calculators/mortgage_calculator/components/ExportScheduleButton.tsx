//מייצא את הלוח סילוקין ל csv
// ExportScheduleButton.tsx
"use client"

import React from "react";
import { ScheduleRow } from "./calculate/loanCalculators";

interface ExportScheduleButtonProps {
  schedule: ScheduleRow[];      // לוח הסילוקין של ההלוואה
  fileName?: string;            // שם הקובץ שיורד
}

export default function ExportScheduleButton({ schedule, fileName }: ExportScheduleButtonProps) {
  const handleExport = () => {
    if (!schedule || schedule.length === 0) return;

    let csvContent = "חודש,יתרת פתיחה,תשלום חודשי,קרן,ריבית,יתרת סגירה\n";

    schedule.forEach((row) => {
      csvContent += [
        row.month,
        row.openingBalance,
        row.payment,
        row.principal,
        row.interest,
        row.closingBalance,
      ].join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", fileName || "schedule.csv");
    link.click();
  };

  return (
    <button
      onClick={handleExport}
      className="mt-2 px-3 py-1 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition text-sm"
    >
      הורד לוח סילוקין
    </button>
  );
}
