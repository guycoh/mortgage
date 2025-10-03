"use client";

import { calculateMixFullTotals } from "./calculate/mixScheduleCalculators";
import { Loan } from "./calculate/loanCalculators";

interface MixScheduleChartSVGProps {
  activeMixId: string | null;
  mixes: { id: string; mix_name: string; loans?: Loan[] }[];
  annualInflation?: number;
}

export default function MixScheduleChartSVG({
  activeMixId,
  mixes,
  annualInflation = 0,
}: MixScheduleChartSVGProps) {
  if (!activeMixId) return <div>לא נבחר תמהיל</div>;
  const mix = mixes.find((m) => m.id === activeMixId);
  if (!mix || !mix.loans) return <div>אין הלוואות בתמהיל</div>;

  const data = calculateMixFullTotals(mix.loans, annualInflation).schedule;

  const width = 800;
  const height = 400;
  const padding = 50;



  const maxPayment = Math.max(...data.map((d) => d.totalPayment));
  const months = data.length;

    // נגדיר את המקרא פעם אחת
    const legendItems = [
    { label: "קרן", color: "#4CAF50" },        // ירוק
    { label: "ריבית", color: "#F44336" },      // אדום
    { label: "תשלום חודשי", color: "#2196F3" } // כחול
    ];








  const scaleX = (month: number) =>
    padding + (month / months) * (width - 2 * padding);
  const scaleY = (val: number) =>
    height - padding - (val / maxPayment) * (height - 2 * padding);

  const makePath = (
    key: "totalPayment" | "totalPrincipal" | "totalInterest"
  ) =>
    data
      .map(
        (d, i) =>
          `${i === 0 ? "M" : "L"} ${scaleX(d.month)} ${scaleY(d[key])}`
      )
      .join(" ");

  const pathPayment = makePath("totalPayment");
  const pathPrincipal = makePath("totalPrincipal");
  const pathInterest = makePath("totalInterest");

  const yStep = 1000;
  const yLines: number[] = [];
  for (let val = 0; val <= maxPayment; val += yStep) {
    yLines.push(val);
  }

  const xStep = 60;
  const xLines: number[] = [];
  for (let m = 0; m <= months; m += xStep) {
    xLines.push(m);
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200 w-full h-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto"
      >
        {/* קווי רשת Y */}
        {yLines.map((val, i) => (
          <g key={i}>
            <line
              x1={padding}
              y1={scaleY(val)}
              x2={width - padding}
              y2={scaleY(val)}
              stroke="#ccc"
              strokeDasharray="2"
            />
            <text
              x={padding - 10}
              y={scaleY(val) + 4}
              textAnchor="end"
              fontSize={12}
            >
              {val / 1000}k
            </text>
          </g>
        ))}

        {/* קווי רשת X */}
        {xLines.map((m, i) => (
          <g key={i}>
            <line
              x1={scaleX(m)}
              y1={padding}
              x2={scaleX(m)}
              y2={height - padding}
              stroke="#ccc"
              strokeDasharray="2"
            />
            <text
              x={scaleX(m)}
              y={height - padding + 15}
              textAnchor="middle"
              fontSize={12}
            >
              {m}
            </text>
          </g>
        ))}

        {/* צירים */}
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="black"
        />
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="black"
        />

        {/* קווים */}
        <path d={pathPayment} stroke="blue" fill="none" strokeWidth={2} />
        <path d={pathPrincipal} stroke="green" fill="none" strokeWidth={2} />
        <path d={pathInterest} stroke="red" fill="none" strokeWidth={2} />

        {/* מקרא */}
        {/* Legend */}
 {/* Legend */}
<g transform={`translate(${width - padding + 20}, ${padding})`}>
  {legendItems.map((item, index) => (
    <g key={item.label} transform={`translate(0, ${index * 30})`}>
      {/* ריבוע צבע */}
      <rect width={12} height={12} fill={item.color} rx={2} />
      {/* טקסט בשורה מתחת */}
      <text x={0} y={20} fontSize={12} fill="black">
        {item.label}
      </text>
    </g>
  ))}
</g>





        {/* כותרת */}
        <text x={width / 2} y={20} textAnchor="middle" fontWeight="bold">
          גרף תשלומים חודשי: קרן, ריבית ותשלום כולל
        </text>
      </svg>
    </div>
  );
}
