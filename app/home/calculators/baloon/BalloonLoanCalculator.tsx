"use client"
import { useState } from "react";

export default function BalloonLoanCalculator() {
  const [loanAmount, setLoanAmount] = useState(100000);
  const [annualRate, setAnnualRate] = useState(5);
  const [periodMonths, setPeriodMonths] = useState(60);
  const [inflationRate, setInflationRate] = useState(2);
 
 const [balloonType, setBalloonType] = useState<"full" | "partial">("partial");

  const [isLinked, setIsLinked] = useState(false);

  const monthlyRate = annualRate / 12 / 100;
  const monthlyInflation = isLinked ? inflationRate / 12 / 100 : 0;

  // שימוש בריבית מצטברת (כולל מדד אם צמוד)
  const effectiveMonthlyRate = (1 + monthlyRate) * (1 + monthlyInflation) - 1;
  const finalAmount = loanAmount * Math.pow(1 + effectiveMonthlyRate, periodMonths);
  const totalInterest = finalAmount - loanAmount;

  const partialMonthly = balloonType === "partial" ? loanAmount * monthlyRate : 0;

  return (
  <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-[#f8fafc] to-[#e6eff3] py-16 px-4">
  <div className="relative">
    {/* גוף הקופסה */}
    <div
      className="relative w-[400px] rounded-xl shadow-2xl overflow-hidden p-6"
      style={{
        background: "linear-gradient(180deg, #1d75a1 0%, #15516f 100%)",
        boxShadow:
          "0 20px 30px rgba(0,0,0,0.3), inset 0 2px 8px rgba(255,255,255,0.15)",
      }}
    >
      {/* קצה עליון מואר */}
      <div className="absolute top-0 left-0 w-full h-[10px] bg-white/20"></div>

      {/* תוכן המחשבון */}
      <div className="flex flex-col space-y-6 text-white">
        <h2 className="text-2xl font-bold text-center tracking-wide">
          מחשבון הלוואת בלון
        </h2>

        <div className="space-y-4">
          {/* סכום הלוואה */}
          <label className="flex flex-col text-white">
            <span className="mb-1 font-medium">
              סכום הלוואה:{" "}
              <span className="text-white font-semibold">{loanAmount.toLocaleString()} ₪</span>
            </span>
            <input
              dir="ltr"
              type="range"
              min={10000}
              max={3000000}
              step={1000}
              value={loanAmount}
              onChange={(e) => setLoanAmount(+e.target.value)}
              className="w-full accent-white"
            />
            <div className="flex justify-between text-xs mt-1 text-white">
              <span>3,000,000 ₪</span>
              <span>10,000 ₪</span>
            </div>
          </label>

          {/* ריבית שנתית */}
          <label className="flex flex-col text-white">
            <span className="mb-1 font-medium">
              ריבית שנתית:{" "}
              <span className="text-white font-semibold">{annualRate.toFixed(2)}%</span>
            </span>
            <input
              dir="ltr"
              type="range"
              min={0}
              max={25}
              step={0.1}
              value={annualRate}
              onChange={(e) => setAnnualRate(+e.target.value)}
              className="w-full accent-white"
            />
            <div className="flex justify-between text-xs mt-1 text-white">
              <span>25%</span>
              <span>0%</span>
            </div>
          </label>

          {/* תקופה */}
          <label className="flex flex-col text-white">
            <span className="mb-1 font-medium">
              תקופה: <span className="text-white font-semibold">{periodMonths} חודשים</span>
            </span>
            <input
              dir="ltr"
              type="range"
              min={1}
              max={360}
              step={1}
              value={periodMonths}
              onChange={(e) => setPeriodMonths(+e.target.value)}
              className="w-full accent-white"
            />
            <div className="flex justify-between text-xs mt-1 text-white">
              <span>360</span>
              <span>1</span>             
            </div>
          </label>

          {/* צמוד למדד */}
          <label className="flex items-center gap-2 text-white">
            <input
              type="checkbox"
              checked={isLinked}
              onChange={(e) => setIsLinked(e.target.checked)}
            />
            <span>הלוואה צמודה למדד</span>
          </label>

          {isLinked && (
            <label className="flex flex-col text-white">
              <span className="mb-1 font-medium">
                מדד שנתי צפוי:{" "}
                <span className="text-white font-semibold">{inflationRate.toFixed(2)}%</span>
              </span>
              <input
                dir="ltr"
                type="range"
                min={0}
                max={25}
                step={0.1}
                value={inflationRate}
                onChange={(e) => setInflationRate(+e.target.value)}
                className="w-full accent-white"
              />
              <div className="flex justify-between text-xs mt-1 text-white">
                <span>0%</span>
                <span>25%</span>
              </div>
            </label>
          )}

        
        {/* סוג בלון */}
        <div className="flex gap-6 text-white items-center">

          {/* בלון חלקי */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="radio"
              name="balloonType"
              value="partial"
              checked={balloonType === "partial"}
              onChange={() => setBalloonType("partial")}
              className="hidden"
            />
            {/* עיגול מעוצב */}
            <span
              className={`w-6 h-6 rounded-md flex items-center justify-center border-2 
                ${balloonType === "partial"
                  ? "bg-white text-[#1d75a1] border-white"
                  : "border-white"
                }`}
            >
              {balloonType === "partial" && (
                <span className="text-lg font-bold leading-none">✓</span>
              )}
            </span>
            <span className="text-lg">בלון חלקי</span>
          </label>

          {/* בלון מלא */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="radio"
              name="balloonType"
              value="full"
              checked={balloonType === "full"}
              onChange={() => setBalloonType("full")}
              className="hidden"
            />
            {/* עיגול מעוצב */}
            <span
              className={`w-6 h-6 rounded-md flex items-center justify-center border-2 
                ${balloonType === "full"
                  ? "bg-white text-[#1d75a1] border-white"
                  : "border-white"
                }`}
            >
              {balloonType === "full" && (
                <span className="text-lg font-bold leading-none">✓</span>
              )}
            </span>
            <span className="text-lg">בלון מלא</span>
          </label>
          
        </div>

        </div>

        {/* תוצאה */}
        <div className="p-4 rounded-md bg-white text-center text-gray-700 shadow-md">
          <h3 className="text-lg font-bold mb-2">תוצאה</h3>
          {balloonType === "full" ? (
            <>
              <p>
                סכום הקרן:{" "}
                <span className="font-semibold">{loanAmount.toLocaleString()} ₪</span>
              </p>
              <p>
                סך הריבית:{" "}
                <span className="font-semibold">
                  {totalInterest.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}{" "}
                  ₪
                </span>
              </p>
              <p>
                סכום ההחזר הסופי:{" "}
                <span className="font-semibold">
                  {finalAmount.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}{" "}
                  ₪
                </span>
              </p>
            </>
          ) : (
            <>
              <p>
                תשלום חודשי:{" "}
                <span className="font-semibold">
                  {partialMonthly.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}{" "}
                  ₪
                </span>
              </p>
              <p className="mt-1 text-sm text-gray-600">+ סכום קרן בסוף התקופה</p>
            </>
          )}
        </div>
      </div>

      {/* קצה תחתון עם הצללה */}
      <div className="absolute bottom-0 left-0 w-full h-[14px] bg-black/20 blur-[2px]"></div>
    </div>

    {/* בסיס/שולחן */}
    <div className="absolute bottom-[-18px] left-1/2 -translate-x-1/2 w-[400px] h-[10px] bg-gradient-to-b from-[#a9b7bf] to-[#6c7b84] rounded-b-xl shadow-md"></div>

    {/* צל רך מתחת */}
    <div className="absolute bottom-[-30px] left-1/2 -translate-x-1/2 w-[360px] h-[20px] bg-black/20 blur-2xl rounded-full"></div>
  </div>
</div>


  );
}

