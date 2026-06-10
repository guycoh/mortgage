"use client"

import { useState } from "react";

type Purpose =
  | "single"
  | "replacement"
  | "investment"
  | "any"
  | "self_build";

const PURPOSES: Record<
  Purpose,
  { label: string; maxLtv: number }
> = {
  single: { label: "דירה יחידה", maxLtv: 75 },
  replacement: { label: "דירה חלופית", maxLtv: 70 },
  investment: { label: "דירה נוספת (השקעה)", maxLtv: 50 },
  any: { label: "כל מטרה", maxLtv: 50 },
  self_build: { label: "בניה עצמית", maxLtv: 70 },
};

export default function AbilityCalculator() {
  const [purpose, setPurpose] = useState<Purpose>("single");

  const [mainAge, setMainAge] = useState("");
  const [secondaryAge, setSecondaryAge] = useState("");

  const [mainIncome, setMainIncome] = useState("");
  const [secondaryIncome, setSecondaryIncome] = useState("");

  const [mainLoans, setMainLoans] = useState("");
  const [secondaryLoans, setSecondaryLoans] = useState("");

  const [assetValue, setAssetValue] = useState("");
  const [equity, setEquity] = useState("");

  // מדינות קלט
const [months, setMonths] = useState(360);       // ברירת מחדל 360 חודשים
const [interest, setInterest] = useState(4.8);   // ברירת מחדל 4.8%

 /* ===== מפריד אלפים ===== */

const formatNumber = (value: string) =>
  value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const parseNumber = (value: string) =>
  Number(value.replace(/,/g, ""));



/* ===== איפוס טופס  ===== */

const resetForm = () => {
  setPurpose("single");

  setMainAge("");
  setSecondaryAge("");

  setMainIncome("");
  setSecondaryIncome("");

  setMainLoans("");
  setSecondaryLoans("");

  setAssetValue("");
  setEquity("");

  setMonths(360);
  setInterest(4.8);
};




  
  /* ===== חישובים ===== */

const asset = parseNumber(assetValue || "0");
const equityAmount = parseNumber(equity || "0");

const totalIncome =
  parseNumber(mainIncome || "0") +
  parseNumber(secondaryIncome || "0");

const totalLoans =
  parseNumber(mainLoans || "0") +
  parseNumber(secondaryLoans || "0");


  const maxMortgageAllowed =
    asset * (PURPOSES[purpose].maxLtv / 100);

  const requestedMortgage = Math.max(
    asset - equityAmount,
    0
  );

  const equityPercent =
  asset > 0 ? (equityAmount / asset) * 100 : 0;


  const isWithinLtv =
    requestedMortgage <= maxMortgageAllowed;


// חישוב החזר חודשי (שפיצר)

const freeIncome = totalIncome - totalLoans;

const monthlyRate = interest / 100 / 12;  // ריבית חודשית
const monthlyPayment =
  months > 0
    ? requestedMortgage * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)))
    : 0;

const crmText = [
  purpose && `מטרת המשכנתא:${PURPOSES[purpose].label}`,
  asset > 0 && `שווי נכס:${asset.toLocaleString()} ₪`,
  equityAmount > 0 && `הון עצמי:${equityAmount.toLocaleString()} ₪`,
  freeIncome > 0 && `הכנסה פנויה:${freeIncome.toLocaleString()} ₪`,
  mainAge && `גיל1:${mainAge}`,
  secondaryAge && `גיל2:${secondaryAge}`,
]
  .filter(Boolean)
  .join("#");


  /* ===== UI ===== */

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-2xl shadow-xl space-y-6">

      {/* שורה ראשונה – מטרה / שווי נכס / הון עצמי */}
      <div className="grid grid-cols-3 gap-4">

        {/* מטרת משכנתא */}
        <div>
          <label className="block font-semibold mb-1">
            מטרת המשכנתא
          </label>
          <select
            value={purpose}
            onChange={(e) =>
              setPurpose(e.target.value as Purpose)
            }
            className="w-full border rounded-lg p-2 focus:bg-orange-50 last:focus:border-orange-400 focus:ring-1 focus:ring-orange-300 focus:outline-none "
          >
            {Object.entries(PURPOSES).map(
              ([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              )
            )}
          </select>
          <div className="text-xs text-gray-600 mt-1">
            אחוז מימון מקסימלי:{" "}
            <span className="font-bold">
              {PURPOSES[purpose].maxLtv}%
            </span>
          </div>
        </div>

        {/* שווי נכס */}
        <div>
          <label className="block font-semibold mb-1">
            שווי נכס
          </label>
          <input
            type="text"
            value={assetValue}
            onChange={(e) =>
                        setAssetValue(formatNumber(e.target.value))
                    }
            placeholder="₪"
            className="w-full border rounded-lg p-2 focus:bg-orange-50 last:focus:border-orange-400 focus:ring-1 focus:ring-orange-300 focus:outline-none "
          />
        </div>

      {/* הון עצמי */}
        <div>
        <label className="block font-semibold mb-1">
            הון עצמי
        </label>

        <input
            type="text"
            value={equity}
            onChange={(e) => setEquity(formatNumber(e.target.value))}
            placeholder="₪"
            className="w-full border rounded-lg p-2 focus:bg-orange-50 last:focus:border-orange-400 focus:ring-1 focus:ring-orange-300 focus:outline-none "
        />

        {asset > 0 && equityAmount > 0 && (
            <div className="text-xs mt-1 text-gray-600">
            אחוז הון עצמי:{" "}
            <span className="font-bold">
                {equityPercent.toFixed(1)}%
            </span>
            </div>
        )}
        </div>

      </div>


      {/* טבלה */}
      <div className="grid grid-cols-3 gap-4 text-sm">

        <div className="font-bold">בן זוג ראשי</div>
        <div className="font-bold">בן זוג משני</div>
        <div className="font-bold">סיכום</div>

        {/* גיל */}
        <input
          value={mainAge}
          onChange={(e) => setMainAge(e.target.value)}
          placeholder="גיל"
          className="w-full border rounded-lg p-2 focus:bg-orange-50 last:focus:border-orange-400 focus:ring-1 focus:ring-orange-300 focus:outline-none "
        />
        <input
          value={secondaryAge}
          onChange={(e) =>
            setSecondaryAge(e.target.value)
          }
          placeholder="גיל"
          className="w-full border rounded-lg p-2 focus:bg-orange-50 last:focus:border-orange-400 focus:ring-1 focus:ring-orange-300 focus:outline-none "
        />
        <div className="border rounded p-2 bg-gray-50 text-center">
          —
        </div>

        {/* הכנסות */}
        <input
          value={mainIncome}
          onChange={(e) => setMainIncome(formatNumber(e.target.value))}           
          placeholder="הכנסה חודשית"
          className="w-full border rounded-lg p-2 focus:bg-orange-50 last:focus:border-orange-400 focus:ring-1 focus:ring-orange-300 focus:outline-none "
        />
        <input
          value={secondaryIncome}
          onChange={(e) => setSecondaryIncome(formatNumber(e.target.value))}
          placeholder="הכנסה חודשית"
          className="w-full border rounded-lg p-2 focus:bg-orange-50 last:focus:border-orange-400 focus:ring-1 focus:ring-orange-300 focus:outline-none "
        />
        <div className="border rounded p-2 bg-gray-50 text-center font-semibold">
          {totalIncome.toLocaleString()} ₪
        </div>

        {/* הלוואות */}
        <input
          value={mainLoans}
          onChange={(e) => setMainLoans(formatNumber(e.target.value))}
          placeholder="הלוואות"
          className="w-full border rounded-lg p-2 focus:bg-orange-50 last:focus:border-orange-400 focus:ring-1 focus:ring-orange-300 focus:outline-none "
        />
        <input
          value={secondaryLoans}
          onChange={(e) => setSecondaryLoans(formatNumber(e.target.value))}
          placeholder="הלוואות"
          className="w-full border rounded-lg p-2 focus:bg-orange-50 last:focus:border-orange-400 focus:ring-1 focus:ring-orange-300 focus:outline-none "
        />
        <div className="border rounded p-2 bg-gray-50 text-center font-semibold">
          {totalLoans.toLocaleString()} ₪
        </div>
      </div>

    

    {/* ===== אזור סיכום מתקדם ===== */}
    <div className="bg-gray-50 rounded-2xl p-6 mt-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        
        {/* טור 1 – אחוזי מימון / הון עצמי */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="font-bold text-base text-gray-800">
            אחוזי מימון
        </h3>

        {/* שווי נכס */}
        <div className="flex justify-between text-sm">
            <span>שווי נכס</span>
            <span className="font-semibold">
            {asset.toLocaleString()} ₪
            </span>
        </div>

        {/* הון עצמי */}
        <div className="flex justify-between text-sm">
            <span>הון עצמי</span>
            <span className="font-semibold">
            {equityAmount.toLocaleString()} ₪
            </span>
        </div>

        {/* אחוז הון עצמי */}
        <div className="flex justify-between text-sm">
            <span>אחוז הון עצמי</span>
            <span className="font-bold">
            {asset > 0 ? ((equityAmount / asset) * 100).toFixed(1) : 0}%
            </span>
        </div>

        {/* שורת אחוז מימון + סכום מקסימלי */}
        <div className="pt-2 border-t text-xs text-gray-600 flex justify-between">
            <span>
            מימון מקסימלי: {PURPOSES[purpose].maxLtv}%
            </span>
            <span className="font-bold">
            {maxMortgageAllowed.toLocaleString()} ₪
            </span>
        </div>

        {/* משכנתא מבוקשת */}
        <div className="pt-2 border-t text-sm flex justify-between font-semibold">
            <span>משכנתא מבוקשת:</span>
            <span>{requestedMortgage.toLocaleString()} ₪</span>
        </div>
        </div>

        {/* טור 2 – הכנסה פנויה */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="font-bold text-base text-gray-800">
            הכנסה פנויה
        </h3>

        {/* הכנסה פנויה */}
        <div className="flex justify-between text-sm font-bold">
            <span>הכנסה פנויה</span>
            <span>
            {(totalIncome - totalLoans).toLocaleString()} ₪
            </span>
        </div>

        {/* תקרת תשלום מומלצת 35% */}
        <div className="flex justify-between text-sm text-green-600">
            <span>תקרת תשלום מומלצת (35%)</span>
            <span>
            {Math.round((totalIncome - totalLoans) * 0.35).toLocaleString()} ₪
            </span>
        </div>

        {/* תקרת תשלום מקסימלית 40% */}
        <div className="flex justify-between text-sm text-red-600">
            <span>תקרת תשלום מקסימלית (40%)</span>
            <span>
            {Math.round((totalIncome - totalLoans) * 0.4).toLocaleString()} ₪
            </span>
        </div>

        <div className="pt-2 border-t text-xs text-gray-500">
            יחס החזר יראה כמה ניתן להקצות למשכנתא בהתאם להכנסה הפנויה
        </div>
        </div>

        {/* טור 3 – מחשבון תשלום משכנתא */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="font-bold text-base text-gray-800">
            תשלום משכנתא
        </h3>

        {/* סכום משכנתא */}
        <div className="flex justify-between text-sm">
            <span>סכום משכנתא</span>
            <span className="font-semibold">{requestedMortgage.toLocaleString()} ₪</span>
        </div>

        {/* מספר חודשים */}
        <div className="flex justify-between text-sm items-center">
            <span>מספר חודשים</span>
            <input
            type="number"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="border rounded p-1 w-20 text-right"
            />
        </div>

        {/* ריבית שנתית */}
        <div className="flex justify-between text-sm items-center">
            <span>ריבית שנתית (%)</span>
            <input
            type="number"
            step="0.01"
            value={interest}
            onChange={(e) => setInterest(Number(e.target.value))}
            className="border rounded p-1 w-20 text-right"
            />
        </div>

        {/* החזר חודשי */}
        <div className="pt-2 border-t flex justify-between font-bold text-sm">
            <span>החזר חודשי</span>
            <span>
            {monthlyPayment > 0 ? monthlyPayment.toLocaleString() : "—"} ₪
            </span>
        </div>

        <div className="text-xs text-gray-500">
            חישוב לפי שפיצר (תשלום קבוע חודשי)
        </div>
        </div>

    </div>

        {/* שדה מוכן להעתקה ל-CRM */}
        {crmText && (
        <div className="mt-6">
            <label className="block font-semibold mb-1 text-sm">
            סיכום להעתקה ל-CRM
            </label>

            <textarea
            readOnly
            value={crmText}
            rows={4}
            className="w-full border rounded-lg p-3 text-sm bg-gray-50 focus:outline-none"
            onClick={(e) => e.currentTarget.select()}
            />
        </div>
        )}



    </div>

            <div className="flex justify-end mt-6">
            <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2 rounded-lg border border-red-300
                        text-red-600 font-semibold
                        hover:bg-red-50 transition"
            >
                ניקוי טופס
            </button>
            </div>

    </div>
  );
}



