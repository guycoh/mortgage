// MergedScheduleChart.tsx
"use client";


import { ScheduleRow } from "./calculate/loanCalculators"; // או הנתיב שלך

interface Props {
  schedule: ScheduleRow[];
}

export default function MergedScheduleChart({ schedule }: Props) {
  if (!schedule.length) return <p className="text-gray-500 text-center">אין נתונים להצגה</p>;

  // מחפשים את הערך המקסימלי כדי להתאים גובה
  const maxPayment = Math.max(...schedule.map((row) => row.payment));

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-end gap-1 h-64 p-2 border rounded bg-white shadow-inner">
        {schedule.map((row, idx) => {
          const heightPercent = (row.payment / maxPayment) * 100;
          return (
            <div key={idx} className="flex flex-col justify-end items-center w-3">
              <div
                className="w-full bg-purple-600 transition-all duration-500 hover:bg-purple-700 rounded-t"
                style={{ height: `${heightPercent}%` }}
              ></div>
              <span className="text-xs mt-1">{row.month}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-xs text-gray-600 text-center">
        גרף החזר חודשי מאוחד (קרן + ריבית)
      </div>
    </div>
  );
}

