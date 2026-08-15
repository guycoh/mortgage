"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { HmButton } from "../../components/HmButton";
import { HmFigure } from "../../components/HmFigure";

interface MonthlyData {
  month: number;
  principalPaid: number;
  interestPaid: number;
  totalPaid: number;
  remainingBalance: number;
}

export default function LoanCalculator() {
  const [amount, setAmount] = useState<number | "">("");
  const [interest, setInterest] = useState<number | "">(5);
  const [months, setMonths] = useState<number | "">("");

  const amountNum = Number(amount) || 0;
  const interestNum = Number(interest) || 0;
  const monthsNum = Number(months) || 0;

  // ריבית חודשית
  const monthlyRate = interestNum / 100 / 12;

  // תשלום חודשי
  // כולל טיפול מיוחד במקרה של ריבית 0%
  const monthlyPayment =
    amountNum > 0 && monthsNum > 0
      ? interestNum === 0
        ? amountNum / monthsNum
        : (amountNum * monthlyRate) /
          (1 - Math.pow(1 + monthlyRate, -monthsNum))
      : 0;

  // טבלת סילוקין
  const getMonthlyBreakdown = (): MonthlyData[] => {
    if (amountNum <= 0 || monthsNum <= 0) return [];

    let balance = amountNum;
    const breakdown: MonthlyData[] = [];

    for (let m = 1; m <= monthsNum; m++) {
      // בחודש האחרון מוודאים שלא נשארת יתרה קטנה בגלל עיגולי חישוב
      const interestPart = balance * monthlyRate;

      let principalPart = monthlyPayment - interestPart;

      // לא מאפשרים החזר קרן גדול מהיתרה
      if (principalPart > balance) {
        principalPart = balance;
      }

      const totalPaid = interestPart + principalPart;

      const remainingBalance = Math.max(
        0,
        balance - principalPart
      );

      breakdown.push({
        month: m,
        interestPaid: interestPart,
        principalPaid: principalPart,
        totalPaid,
        remainingBalance,
      });

      balance = remainingBalance;

      // אם הגענו לאפס אפשר לעצור
      if (balance <= 0) {
        break;
      }
    }

    return breakdown;
  };

  const breakdown = getMonthlyBreakdown();

  // סיכומים
  const totalInterest = breakdown.reduce(
    (sum, row) => sum + row.interestPaid,
    0
  );

  const totalPrincipal = breakdown.reduce(
    (sum, row) => sum + row.principalPaid,
    0
  );

  const totalPayment = breakdown.reduce(
    (sum, row) => sum + row.totalPaid,
    0
  );

  // איפוס
  const resetForm = () => {
    setAmount("");
    setInterest(5);
    setMonths("");
  };

  return (
    <div className="hm-page">
      <div className="flex min-h-screen items-start justify-center bg-linear-to-b from-[#f8fafc] to-[#e6eff3] px-2 pt-10 pb-20">
        <div className="relative w-full max-w-[500px]">

          {/* ===== קוביית המחשבון ===== */}
          <div className="hm-device z-10 p-5 sm:p-8">
            <div className="hm-device-gloss" />

            {/* תוכן המחשבון */}
            <div className="relative flex flex-col items-center space-y-5">

              <h2 className="text-center text-2xl font-extrabold drop-shadow-lg sm:text-3xl">
                מחשבון הלוואה
              </h2>

              {/* ===== שדות הקלט ===== */}
              <div className="w-full space-y-4">

                {/* סכום ההלוואה */}
                <div>
                  <label className="mb-1 block text-sm opacity-90">
                    סכום ההלוואה (₪)
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="לדוגמה: 350,000"
                    className="hm-field"
                    value={
                      amount === ""
                        ? ""
                        : amount.toLocaleString("he-IL")
                    }
                    onChange={(e) => {
                      // מאפשר רק מספרים
                      const raw = e.target.value.replace(/[^\d]/g, "");

                      if (raw === "") {
                        setAmount("");
                        return;
                      }

                      const num = Number(raw);

                      if (!Number.isNaN(num)) {
                        setAmount(num);
                      }
                    }}
                  />
                </div>

                {/* ריבית שנתית */}
                <div>
                  <label className="mb-2 block text-sm text-slate-100">
                    ריבית שנתית (%)
                  </label>

                  <div className="flex items-center gap-3">

                    {/* מחוון */}
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="0.1"
                      dir="ltr"
                      value={interest === "" ? 0 : interest}
                      onChange={(e) =>
                        setInterest(Number(e.target.value))
                      }
                      className="
                        h-2 w-full cursor-pointer
                        appearance-none rounded-lg
                        bg-[rgba(255,250,226,0.35)]
                        [&::-webkit-slider-thumb]:h-5
                        [&::-webkit-slider-thumb]:w-5
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-(--hm-gold-200)
                        [&::-webkit-slider-thumb]:border-2
                        [&::-webkit-slider-thumb]:border-[#fffaea]
                        [&::-webkit-slider-thumb]:shadow-md
                        [&::-webkit-slider-runnable-track]:rounded-lg
                      "
                    />

                    {/* תצוגת אחוז */}
                    <span className="w-12 text-center font-bold">
                      {interestNum.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* חודשי הלוואה */}
                <div>
                  <label className="mb-1 block text-sm opacity-90">
                    מספר חודשי הלוואה
                  </label>

                  <input
                    type="number"
                    min="1"
                    max="600"
                    step="1"
                    placeholder="לדוגמה: 240"
                    className="hm-field"
                    value={months}
                    onChange={(e) => {
                      const value = e.target.value;

                      if (value === "") {
                        setMonths("");
                        return;
                      }

                      const num = Number(value);

                      if (Number.isNaN(num)) return;

                      // מגביל ל-1 עד 600 חודשים
                      const limited = Math.min(
                        Math.max(num, 1),
                        600
                      );

                      setMonths(limited);
                    }}
                  />

                  <p className="mt-1 text-xs opacity-70">
                    ניתן להזין בין 1 ל־600 חודשים
                  </p>
                </div>
              </div>

              {/* ===== כפתור ניקוי ===== */}
              <HmButton
                onClick={resetForm}
                variant="ghost"
                fullWidth
                icon={
                  <RotateCcw className="h-[18px] w-[18px]" />
                }
              >
                נקה
              </HmButton>

              {/* ===== תוצאה ===== */}
              <div className="hm-panel mt-3 w-full p-4 text-center">
                <p className="text-[12px] font-semibold tracking-[0.14em] text-[var(--hm-ink-faint)]">
                  תשלום חודשי מוערך
                </p>

                <p className="hm-figure mt-1.5 text-3xl">
                  <HmFigure
                    value={monthlyPayment}
                    decimals={0}
                  />
                </p>
              </div>

              {/* ===== סיכום ===== */}
              {breakdown.length > 0 && (
                <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">

                  {/* סך ההחזר */}
                  <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-sm">
                    <p className="text-xs opacity-75">
                      סך ההחזר
                    </p>

                    <p className="mt-1 text-lg font-bold">
                      {Math.round(totalPayment).toLocaleString(
                        "he-IL"
                      )} ₪
                    </p>
                  </div>

                  {/* סך הריבית */}
                  <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-sm">
                    <p className="text-xs opacity-75">
                      סך הריבית
                    </p>

                    <p className="mt-1 text-lg font-bold text-rose-300">
                      {Math.round(totalInterest).toLocaleString(
                        "he-IL"
                      )} ₪
                    </p>
                  </div>

                  {/* סך הקרן */}
                  <div className="rounded-xl bg-white/10 p-3 text-center backdrop-blur-sm">
                    <p className="text-xs opacity-75">
                      סך הקרן
                    </p>

                    <p className="mt-1 text-lg font-bold text-emerald-300">
                      {Math.round(totalPrincipal).toLocaleString(
                        "he-IL"
                      )} ₪
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="hm-device-shade" />
          </div>

          {/* ===== בסיס / שולחן ===== */}
          <div className="relative z-0 mt-[-10px] h-[50px] w-full">

            <div className="hm-device-base absolute top-0 left-1/2 h-[10px] w-full max-w-[500px] -translate-x-1/2 rounded-b-2xl shadow-md" />

            <div className="absolute top-10 left-1/2 h-[20px] w-[85%] max-w-[400px] -translate-x-1/2 rounded-full bg-black/20 blur-2xl" />
          </div>

          {/* ===== טבלת סילוקין ===== */}
          {breakdown.length > 0 && (
            <div className="mt-12 w-full rounded-xl bg-white p-4 text-gray-900 shadow-inner">

              <h2 className="mb-3 text-xl font-bold text-gray-800">
                פירוט חודשי
              </h2>

              {/* גלילה אופקית במובייל */}
              <div className="max-h-[500px] overflow-x-auto overflow-y-auto">
                <table className="w-full min-w-[600px] text-right text-sm">

                  <thead className="sticky top-0 border-b bg-white text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">
                        חודש
                      </th>

                      <th className="px-3 py-2">
                        תשלום חודשי
                      </th>

                      <th className="px-3 py-2 text-rose-500">
                        ריבית
                      </th>

                      <th className="px-3 py-2 text-emerald-600">
                        קרן
                      </th>

                      <th className="px-3 py-2">
                        יתרה
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {breakdown.map((row) => (
                      <tr
                        key={row.month}
                        className="border-b transition hover:bg-sky-50"
                      >
                        <td className="px-3 py-2">
                          {row.month}
                        </td>

                        <td className="px-3 py-2">
                          {Math.round(
                            row.totalPaid
                          ).toLocaleString("he-IL")}
                        </td>

                        <td className="px-3 py-2 text-rose-500">
                          {Math.round(
                            row.interestPaid
                          ).toLocaleString("he-IL")}
                        </td>

                        <td className="px-3 py-2 text-emerald-600">
                          {Math.round(
                            row.principalPaid
                          ).toLocaleString("he-IL")}
                        </td>

                        <td className="px-3 py-2">
                          {Math.round(
                            row.remainingBalance
                          ).toLocaleString("he-IL")}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}