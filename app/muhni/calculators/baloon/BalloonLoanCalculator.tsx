"use client";
import { useState } from "react";

export default function BalloonLoanCalculator() {
  const [loanAmount, setLoanAmount] = useState(100000);
  const [annualRate, setAnnualRate] = useState(5);
  const [periodMonths, setPeriodMonths] = useState(60);
  const [inflationRate, setInflationRate] = useState(2);
  const [balloonType, setBalloonType] = useState<"full" | "partial">("full");
  const [isLinked, setIsLinked] = useState(false);

  const monthlyRate = annualRate / 12 / 100;
  const monthlyInflation = isLinked ? inflationRate / 12 / 100 : 0;

  // שימוש בריבית מצטברת (כולל מדד אם צמוד)
  const effectiveMonthlyRate = (1 + monthlyRate) * (1 + monthlyInflation) - 1;
  const finalAmount = loanAmount * Math.pow(1 + effectiveMonthlyRate, periodMonths);
  const totalInterest = finalAmount - loanAmount;

  const partialMonthly = balloonType === "partial" ? loanAmount * monthlyRate : 0;

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      <h2 className="text-2xl font-bold text-center">מחשבון הלוואת בלון</h2>

      <label className="flex flex-col">
        <span className="mb-1 font-medium">
          סכום הלוואה: <span className="text-main">{loanAmount.toLocaleString()} ₪</span>
        </span>
        <input
          dir="ltr"
          type="range"
          min={10000}
          max={1000000}
          step={1000}
          value={loanAmount}
          onChange={(e) => setLoanAmount(+e.target.value)}
          className="w-full accent-main"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1,000,000 ₪</span>
          <span>10,000 ₪</span>
        </div>
      </label>

      <label className="flex flex-col">
        <span className="mb-1 font-medium">
          ריבית שנתית: <span className="text-main">{annualRate.toFixed(2)}%</span>
        </span>
        <input
          dir="ltr"
          type="range"
          min={0}
          max={25}
          step={0.1}
          value={annualRate}
          onChange={(e) => setAnnualRate(+e.target.value)}
          className="w-full accent-main"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>25%</span>
          <span>0%</span>
        </div>
      </label>

      <label className="flex flex-col">
        <span className="mb-1 font-medium">
          תקופה: <span className="text-main">{periodMonths} חודשים</span>
        </span>
        <input
          dir="ltr"
          type="range"
          min={1}
          max={360}
          step={1}
          value={periodMonths}
          onChange={(e) => setPeriodMonths(+e.target.value)}
          className="w-full accent-main"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1</span>
          <span>360</span>
        </div>
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isLinked}
          onChange={(e) => setIsLinked(e.target.checked)}
        />
        <span>הלוואה צמודה למדד</span>
      </label>

      {isLinked && (
        <label className="flex flex-col">
          <span className="mb-1 font-medium">
            מדד שנתי צפוי: <span className="text-main">{inflationRate.toFixed(2)}%</span>
          </span>
          <input
            dir="ltr"
            type="range"
            min={0}
            max={25}
            step={0.1}
            value={inflationRate}
            onChange={(e) => setInflationRate(+e.target.value)}
            className="w-full accent-main"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>25%</span>
          </div>
        </label>
      )}

      <label className="flex gap-4">
        <span>
          <input
            type="radio"
            name="balloonType"
            value="full"
            checked={balloonType === "full"}
            onChange={() => setBalloonType("full")}
          />
          <span className="ml-2">בלון מלא</span>
        </span>
        <span>
          <input
            type="radio"
            name="balloonType"
            value="partial"
            checked={balloonType === "partial"}
            onChange={() => setBalloonType("partial")}
          />
          <span className="ml-2">בלון חלקי</span>
        </span>
      </label>

      <div className="p-4 border  bg-gray-50 text-center">
        <h3 className="text-lg font-bold mb-2">תוצאה</h3>

        {balloonType === "full" ? (
          <>
            <p>
              סכום הקרן:{" "}
              <span className="text-main font-semibold">
                {loanAmount.toLocaleString()} ₪
              </span>
            </p>
            <p>
              סך הריבית:{" "}
              <span className="text-main font-semibold">
                {totalInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })} ₪
              </span>
            </p>
            <p>
              סכום ההחזר הסופי:{" "}
              <span className="text-main font-semibold">
                {finalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ₪
              </span>
            </p>
          </>
        ) : (
          <>
            <p>
              תשלום חודשי:{" "}
              <span className="text-main font-semibold">
                {partialMonthly.toLocaleString(undefined, { maximumFractionDigits: 2 })} ₪
              </span>
            </p>
            <p className="mt-1 text-sm text-gray-600">+ סכום קרן בסוף התקופה</p>
          </>
        )}
      </div>
    </div>
  );
}

