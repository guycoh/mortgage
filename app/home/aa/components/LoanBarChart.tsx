'use client';

import React from 'react';

interface MonthlyData {
  month: number;
  principal: number;
  interest: number;
}

interface Props {
  data: MonthlyData[];
}

export default function LoanBarChart({ data }: Props) {
  const barWidth = 30;
  const barSpacing = 50;
  const offsetX = 50;
  const offsetY = 260;
  const scale = 0.15; // התאמת גובה לגרף

  const svgWidth = offsetX + data.length * barSpacing + 50;
  const svgHeight = 300;

  return (
    <div className="w-full overflow-x-auto">
      <svg width={svgWidth} height={svgHeight}>
        {/* ציר X */}
        <line x1={offsetX - 10} y1={offsetY} x2={svgWidth - 30} y2={offsetY} stroke="#ccc" strokeWidth="2" />

        {/* ציור כל חודש */}
        {data.map((item, i) => {
          const x = offsetX + i * barSpacing;
          const principalHeight = item.principal * scale;
          const interestHeight = item.interest * scale;

          const principalY = offsetY - principalHeight;
          const interestY = principalY - interestHeight;

          return (
            <g key={i}>
              {/* ריבית */}
              <rect x={x - barWidth / 2} y={interestY} width={barWidth} height={interestHeight} fill="#fbbf24" rx="3" />
              {/* קרן */}
              <rect x={x - barWidth / 2} y={principalY} width={barWidth} height={principalHeight} fill="#10b981" rx="3" />

              {/* ערכים מעל העמודות */}
              <text x={x} y={interestY - 5} fontSize="11" textAnchor="middle" fill="#b45309">
                ₪{Math.round(item.interest)}
              </text>
              <text x={x} y={principalY - 5} fontSize="11" textAnchor="middle" fill="#065f46">
                ₪{Math.round(item.principal)}
              </text>

              {/* תווית חודש */}
              <text x={x} y={offsetY + 15} fontSize="12" textAnchor="middle" fill="#555">
                חודש {item.month}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
