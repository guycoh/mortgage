"use client";

import React from "react";
import { calculateUnifiedSchedule, CombinedRow } from "./calculators/mixScheduleCalculators";
import { Loan } from "./calculators/loanCalculators";

interface Mix {
  id: string;
  mix_name: string;
  loans?: Loan[];
}

interface MixScheduleSVGChartProps {
  activeMixId: string | null;
  mixes: Mix[];
  annualInflation?: number;
  width?: number;
  height?: number;
}

export default function MixScheduleSVGChart({
  activeMixId,
  mixes,
  annualInflation = 0,
  width = 700,
  height = 300,
}: MixScheduleSVGChartProps) {
  const activeMix = mixes.find((mix) => mix.id === activeMixId);
  if (!activeMix || !activeMix.loans?.length) return null;

  const schedule: CombinedRow[] = calculateUnifiedSchedule(activeMix.loans, annualInflation);
  if (schedule.length === 0) return null;

  const padding = 50;

  const maxPayment = Math.max(...schedule.map((r) => r.totalPayment));

  const xScale = (i: number) => padding + ((width - 2 * padding) * i) / (schedule.length - 1);
  const yScale = (value: number) => height - padding - ((height - 2 * padding) * value) / maxPayment;

  // קו תשלום חודשי
  const path = schedule
    .map((r, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(r.totalPayment)}`)
    .join(" ");

  // צירי גרף
  const yTicks = 5;
  const xTicks = schedule.length;

  return (
    <div className="p-4 border rounded-lg shadow">
      <h2 className="text-lg font-semibold text-center mb-4">
        גרף תשלום חודשי — {activeMix.mix_name}
      </h2>

      <svg width={width} height={height} className="bg-gray-50">
        {/* ציר Y */}
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="black"
          strokeWidth={2}
        />
        {/* ציר X */}
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="black"
          strokeWidth={2}
        />

        {/* סימוני ציר Y */}
        {[...Array(yTicks + 1)].map((_, i) => {
          const y = padding + ((height - 2 * padding) * i) / yTicks;
          const value = Math.round(maxPayment * (1 - i / yTicks));
          return (
            <g key={i}>
              <line x1={padding - 5} x2={padding} y1={y} y2={y} stroke="black" />
              <text x={padding - 10} y={y + 4} textAnchor="end" fontSize="10">
                {value.toLocaleString("he-IL")}
              </text>
            </g>
          );
        })}

        {/* סימוני ציר X */}
        {schedule.map((r, i) => {
          const x = xScale(i);
          if ((i + 1) % Math.ceil(schedule.length / 10) !== 0 && i !== 0) return null; // לא להעמיס
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={height - padding} y2={height - padding + 5} stroke="black" />
              <text x={x} y={height - padding + 15} textAnchor="middle" fontSize="10">
                {r.month}
              </text>
            </g>
          );
        })}

        {/* רשתות אופקיות */}
        {[...Array(yTicks + 1)].map((_, i) => {
          const y = padding + ((height - 2 * padding) * i) / yTicks;
          return <line key={i} x1={padding} x2={width - padding} y1={y} y2={y} stroke="#ddd" />;
        })}

        {/* קו תשלום חודשי */}
        <path d={path} fill="none" stroke="blue" strokeWidth={2} />

        {/* נקודות לכל חודש */}
        {schedule.map((r, i) => (
          <circle key={i} cx={xScale(i)} cy={yScale(r.totalPayment)} r={2} fill="red" />
        ))}
      </svg>
    </div>
  );
}
