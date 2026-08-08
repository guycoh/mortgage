"use client";

import { useState } from "react";
//import CustomButton from "../../components/CustomButton";
import { Calculator, RotateCcw } from "lucide-react";
import ReverseMortgageLoanComparison from "./ReverseMortgageLoanComparison";
import { HmButton } from "../../components/HmButton";
import { HmFigure } from "../../components/HmFigure";
import { HmReveal } from "../../components/HmReveal";


type Result = {
  loan: number;
  percent: number;
  decidingAge: number;
} | null;

export default function ReverseMortgageCalculator() {
  const [propertyValue, setPropertyValue] = useState("");
  const [age1, setAge1] = useState("");
  const [age2, setAge2] = useState("");

  // הגדרת ערכי ברירת מחדל
  const [months, setMonths] = useState("360");
  const [interestRate, setInterestRate] = useState("4.5");
  const [indexRate, setIndexRate] = useState("2");
  const [result, setResult] = useState<Result>(null);

  const formatNumber = (value: string) => {
    if (!value) return "";
    return Number(value.replace(/,/g, "")).toLocaleString("he-IL");
  };

  const calculate = () => {
    const value = Number(propertyValue);
    const borrower1 = Number(age1);
    const borrower2 = Number(age2);

    if (!value || !borrower1) return;

    if (borrower1 < 55) {
      alert("גיל לווה חייב להיות מעל 55");
      return;
    }

    if (age2 && borrower2 < 55) {
      alert("גיל לווה 2 חייב להיות מעל 55");
      return;
    }

    const decidingAge = age2 ? Math.min(borrower1, borrower2) : borrower1;
    const percent = 15+5 + Math.max(0, decidingAge - 55);
    const loan = value * (percent / 100);

    setResult({
      decidingAge,
      percent,
      loan,
    });
  };

  // פונקציית איפוס שמחזירה לערכי ברירת המחדל המבוקשים
  const handleClear = () => {
    setPropertyValue("");
    setAge1("");
    setAge2("");
    setMonths("360");
    setInterestRate("4.5");
    setIndexRate("2");
    setResult(null);
  };

  return (
    <div className="relative w-full max-w-xl md:max-w-5xl">
      {/* גוף מחשבון */}
      <div className="hm-device p-5 sm:p-6">
        <div className="hm-device-gloss" />

        <div className="relative flex flex-col items-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-wide drop-shadow-lg text-center">
            משכנתא הפוכה
          </h2>

          <div className="w-full grid grid-cols-1 md:grid-cols-7 gap-3 items-end">
            {/* שווי נכס */}
            <div className="flex flex-col gap-1">
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-sm font-semibold">שווי נכס</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="₪ שווי נכס"
                  className="hm-field"
                  value={propertyValue ? formatNumber(propertyValue) : ""}
                  onChange={e => setPropertyValue(e.target.value.replace(/,/g, ""))}
                />
              </div>
            </div>

            {/* גיל לווה 1 */}
            <div className="flex flex-col gap-1 md:col-span-1">
              <label className="text-sm font-semibold">גיל לווה 1</label>
              <input
                type="number"
                maxLength={3}
                placeholder="גיל"
                className="hm-field"
                value={age1}
                onChange={e => setAge1(e.target.value.slice(0, 3))}
              />
            </div>

            {/* גיל לווה 2 */}
            <div className="flex flex-col gap-1 md:col-span-1">
              <label className="text-sm font-semibold">
                גיל לווה 2 <span className="text-xs opacity-80">(רשות)</span>
              </label>
              <input
                type="number"
                maxLength={3}
                placeholder="גיל"
                className="hm-field"
                value={age2}
                onChange={e => setAge2(e.target.value.slice(0, 3))}
              />
            </div>

            {/* גיל קובע */}
            <div className="flex flex-col gap-1 md:col-span-1 md:max-w-20">
              <label className="text-sm font-semibold text-white/90">גיל קובע</label>
              <div className="h-11.5 rounded-md px-3 flex items-center justify-center bg-white/20 backdrop-blur-sm border border-white/30 shadow-inner font-bold">
                {age1 ? (age2 ? Math.min(Number(age1), Number(age2)) : age1) : "-"}
              </div>
            </div>

            {/* תקופה */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold">תקופה (חודשים)</label>
              <input
                type="number"
                placeholder="360"
                className="hm-field"
                value={months}
                onChange={e => setMonths(e.target.value)}
              />
            </div>

            {/* ריבית שנתית */}
            <div className="flex flex-col gap-1 md:col-span-1">
              <label className="text-sm font-semibold">ריבית שנתית %</label>
              <input
                type="number"
                step="0.01"
                placeholder="0"
                className="hm-field"
                value={interestRate}
                onChange={e => setInterestRate(e.target.value)}
              />
            </div>

            {/* מדד */}
            <div className="flex flex-col gap-1 md:col-span-1">
              <label className="text-sm font-semibold">מדד שנתי משוער %</label>
              <input
                type="number"
                placeholder="0"
                className="hm-field"
                value={indexRate}
                onChange={e => setIndexRate(e.target.value)}
              />
            </div>
          </div>

          {/* כפתורי מחשבון */}
          <div className="grid w-full grid-cols-2 items-center gap-3">
            <HmButton onClick={calculate} fullWidth icon={<Calculator className="h-[18px] w-[18px]" />}>
              חשב
            </HmButton>
            <HmButton
              onClick={handleClear}
              variant="ghost"
              fullWidth
              icon={<RotateCcw className="h-[18px] w-[18px]" />}
            >
              נקה טופס
            </HmButton>
          </div>

          <HmReveal show={!!result}>
            <div className="hm-panel mt-3 p-4">
              <div className="hm-row mb-3 p-3 text-center">
                אחוז מימון: <b>{result?.percent}%</b>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[12px] font-semibold tracking-[0.14em] text-[var(--hm-ink-faint)]">
                  משכנתא מקסימלית
                </span>
                <span className="hm-figure text-2xl">
                  <HmFigure value={result?.loan ?? 0} />
                </span>
              </div>
            </div>
          </HmReveal>

          {result && (
            <ReverseMortgageLoanComparison
              maxLoan={result.loan}
              interestRate={Number(interestRate) || 0}
              indexRate={Number(indexRate) || 0}
              months={Number(months) || 360}
            />
          )}
        </div>

        <div className="hm-device-shade" />
      </div>

      <div className="hm-device-base absolute -bottom-4.5 left-1/2 -translate-x-1/2 w-full h-2.5 rounded-b-xl shadow-md" />
      <div className="absolute -bottom-7.5 left-1/2 -translate-x-1/2 w-[85%] h-5 bg-black/20 blur-2xl rounded-full" />
    </div>
  );
}