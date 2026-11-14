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

type Track = {
  id: string;
  name: string;
  amount: string;
  months: string;
  interest: string;
};

export default function AbilityCalculator() {
  const [purpose, setPurpose] = useState<Purpose>("single");

  const [mainAge, setMainAge] = useState("");
  const [secondaryAge, setSecondaryAge] = useState("");

  const [mainIncome, setMainIncome] = useState("");
  const [secondaryIncome, setSecondaryIncome] = useState("");

  const [mainLoans, setMainLoans] = useState("");
  const [secondaryLoans, setSecondaryLoans] = useState("");
  
  const [mainLoanBalance, setMainLoanBalance] = useState("");
  const [secondaryLoanBalance, setSecondaryLoanBalance] = useState("");

  const [guarantorAge, setGuarantorAge] = useState("");
  const [guarantorIncome, setGuarantorIncome] = useState("");
  const [guarantorLoans, setGuarantorLoans] = useState("");
  const [guarantorLoanBalance, setGuarantorLoanBalance] = useState("");

  const [assetValue, setAssetValue] = useState("");
  const [isDiscounted, setIsDiscounted] = useState(false);
  const [contractPrice, setContractPrice] = useState("");
  const [locationGrant, setLocationGrant] = useState("");
  
  const [equity, setEquity] = useState("");

  // מסלולי משכנתא דינמיים
  const [tracks, setTracks] = useState<Track[]>([
    { id: "1", name: "פריים", amount: "", months: "360", interest: "4.8" }
  ]);

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
    setMainLoanBalance("");
    setSecondaryLoanBalance("");
    setAssetValue("");
    setIsDiscounted(false);
    setContractPrice("");
    setLocationGrant("");
    setEquity("");
    setGuarantorAge("");
    setGuarantorIncome("");
    setGuarantorLoans("");
    setGuarantorLoanBalance("");
    setTracks([{ id: "1", name: "פריים", amount: "", months: "360", interest: "4.8" }]);
  };

  /* ===== חישובים ללווים ולנכס ===== */
  const asset = parseNumber(assetValue || "0");
  const equityAmount = parseNumber(equity || "0");
  const guarantorIncomeAmount = parseNumber(guarantorIncome || "0");

  const totalIncome =
    parseNumber(mainIncome || "0") +
    parseNumber(secondaryIncome || "0") +
    (guarantorIncomeAmount * 0.5);

  const totalLoans =
    parseNumber(mainLoans || "0") +
    parseNumber(secondaryLoans || "0") +
    parseNumber(guarantorLoans || "0");
    
  const totalLoanBalance =
    parseNumber(mainLoanBalance || "0") +
    parseNumber(secondaryLoanBalance || "0") +
    parseNumber(guarantorLoanBalance || "0");

  const maxMortgageAllowed = asset * (PURPOSES[purpose].maxLtv / 100);
  const requestedMortgage = Math.max(asset - equityAmount, 0);
  const equityPercent = asset > 0 ? (equityAmount / asset) * 100 : 0;

  /* ===== ניהול וחישוב מסלולים ===== */
  const addTrack = () => {
    const newId = Date.now().toString();
    setTracks([...tracks, { id: newId, name: "", amount: "", months: "360", interest: "" }]);
  };

  const updateTrack = (id: string, field: keyof Track, value: string) => {
    setTracks(tracks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const removeTrack = (id: string) => {
    setTracks(tracks.filter(t => t.id !== id));
  };

  const calculateTrackPmt = (amountStr: string, monthsStr: string, interestStr: string) => {
    const amount = parseNumber(amountStr || "0");
    const months = Number(monthsStr || "0");
    const interest = Number(interestStr || "0");

    if (amount <= 0 || months <= 0 || interest <= 0) return 0;
    
    const monthlyRate = interest / 100 / 12;
    return amount * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)));
  };

  const totalTracksPayment = tracks.reduce((acc, track) => {
    return acc + calculateTrackPmt(track.amount, track.months, track.interest);
  }, 0);

  const totalTracksAmount = tracks.reduce((acc, track) => acc + parseNumber(track.amount || "0"), 0);

  /* ===== יצירת טקסט ל-CRM ===== */
  const crmText = [
    purpose && `מטרת המשכנתא:${PURPOSES[purpose].label}`,
    asset > 0 && `שווי נכס:${asset.toLocaleString()} ₪`,
    isDiscounted && contractPrice && `מחיר חוזה (בהנחה):${contractPrice} ₪`,
    isDiscounted && locationGrant && `מענק מקום:${locationGrant} ₪`,
    equityAmount > 0 && `הון עצמי:${equityAmount.toLocaleString()} ₪`,
    totalIncome > 0 && `הכנסה כוללת:${totalIncome.toLocaleString()} ₪`,
    totalLoans > 0 && `החזר הלוואות:${totalLoans.toLocaleString()} ₪`,
    totalLoanBalance > 0 && `יתרת הלוואות:${totalLoanBalance.toLocaleString()} ₪`,
    mainAge && `גיל1:${mainAge}`,
    secondaryAge && `גיל2:${secondaryAge}`,
    guarantorAge && `גיל ערב:${guarantorAge}`,
    guarantorIncome && `הכנסת ערב:${guarantorIncome}`,
    totalTracksAmount > 0 && `סך משכנתא מתוכנן:${totalTracksAmount.toLocaleString()} ₪`,
    totalTracksPayment > 0 && `החזר חודשי צפוי:${Math.round(totalTracksPayment).toLocaleString()} ₪`,
  ]
    .filter(Boolean)
    .join("#");

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-2xl shadow-xl space-y-6">
      
      {/* כותרת ראשית */}
      <h1 className="text-3xl font-bold text-gray-800 text-center mb-8">
        משכנתא לרכישה לסימולטור
      </h1>

      {/* שורה ראשונה – מטרה / שווי נכס / הון עצמי */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* מטרת משכנתא */}
        <div>
          <label className="block font-semibold mb-1">
            מטרת המשכנתא
          </label>
          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as Purpose)}
            className="w-full border rounded-lg p-2 focus:bg-orange-50 last:focus:border-orange-400 focus:ring-1 focus:ring-orange-300 focus:outline-none"
          >
            {Object.entries(PURPOSES).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
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
          <div className="flex items-center gap-4 mb-1">
            <label className="font-semibold">
              שווי נכס
            </label>
            <label className="flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isDiscounted}
                onChange={(e) => setIsDiscounted(e.target.checked)}
                className="w-4 h-4 rounded text-orange-500 focus:ring-orange-400 accent-orange-500"
              />
              <span className="text-sm text-gray-700 mr-2">דירה בהנחה</span>
            </label>
          </div>
          <input
            type="text"
            value={assetValue}
            onChange={(e) => setAssetValue(formatNumber(e.target.value))}
            placeholder="₪"
            className="w-full border rounded-lg p-2 focus:bg-orange-50 focus:border-orange-400 focus:ring-1 focus:ring-orange-300 focus:outline-none mb-3"
          />

          {isDiscounted && (
            <>
              <div className="mb-3">
                <label className="block text-sm font-semibold mb-1 text-orange-700">
                  מחיר חוזה (דירה בהנחה)
                </label>
                <input
                  type="text"
                  value={contractPrice}
                  onChange={(e) => setContractPrice(formatNumber(e.target.value))}
                  placeholder="₪"
                  className="w-full border rounded-lg p-2 focus:bg-orange-50 focus:border-orange-400 focus:ring-1 focus:ring-orange-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  מענק מקום (אם קיים)
                </label>
                <input
                  type="text"
                  value={locationGrant}
                  onChange={(e) => setLocationGrant(formatNumber(e.target.value))}
                  placeholder="₪"
                  className="w-full border rounded-lg p-2 focus:bg-orange-50 focus:border-orange-400 focus:ring-1 focus:ring-orange-300 focus:outline-none"
                />
              </div>
            </>
          )}
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
            className="w-full border rounded-lg p-2 focus:bg-orange-50 focus:border-orange-400 focus:ring-1 focus:ring-orange-300 focus:outline-none"
          />

          {asset > 0 && equityAmount > 0 && (
            <div className="text-xs mt-1 text-gray-600">
              אחוז הון עצמי: <span className="font-bold">{equityPercent.toFixed(1)}%</span>
            </div>
          )}

          {asset > 0 && (
            <div className="text-xs mt-2 text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>אחוז הון עצמי מינימלי:</span>
                <span className="font-bold">{(100 - PURPOSES[purpose].maxLtv)}%</span>
              </div>
              <div className="flex justify-between">
                <span>הון עצמי מינימלי:</span>
                <span className="font-bold">
                  {(asset * ((100 - PURPOSES[purpose].maxLtv) / 100)).toLocaleString()} ₪
                </span>
              </div>
              <div className="flex justify-between text-orange-600">
                <span>השלמת הון עצמי:</span>
                <span className="font-bold">
                  {Math.max((asset * ((100 - PURPOSES[purpose].maxLtv) / 100)) - equityAmount, 0).toLocaleString()} ₪
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* טבלת לווים עם תוויות */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-gray-50 p-4 rounded-xl">
        {/* בן זוג ראשי */}
        <div className="space-y-3">
          <div className="font-bold text-lg border-b pb-1">בן זוג ראשי</div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">גיל</label>
            <input
              value={mainAge}
              onChange={(e) => setMainAge(e.target.value)}
              placeholder="גיל"
              className="w-full border rounded-lg p-2 focus:bg-orange-50 focus:ring-1 focus:ring-orange-300 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">הכנסה חודשית</label>
            <input
              value={mainIncome}
              onChange={(e) => setMainIncome(formatNumber(e.target.value))}
              placeholder="₪"
              className="w-full border rounded-lg p-2 focus:bg-orange-50 focus:ring-1 focus:ring-orange-300 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">הלוואה חודשית (החזר)</label>
            <input
              value={mainLoans}
              onChange={(e) => setMainLoans(formatNumber(e.target.value))}
              placeholder="₪"
              className="w-full border rounded-lg p-2 focus:bg-orange-50 focus:ring-1 focus:ring-orange-300 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">יתרת הלוואה</label>
            <input
              value={mainLoanBalance}
              onChange={(e) => setMainLoanBalance(formatNumber(e.target.value))}
              placeholder="₪"
              className="w-full border rounded-lg p-2 focus:bg-orange-50 focus:ring-1 focus:ring-orange-300 outline-none"
            />
          </div>
        </div>

        {/* בן זוג משני */}
        <div className="space-y-3">
          <div className="font-bold text-lg border-b pb-1">בן זוג משני</div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">גיל</label>
            <input
              value={secondaryAge}
              onChange={(e) => setSecondaryAge(e.target.value)}
              placeholder="גיל"
              className="w-full border rounded-lg p-2 focus:bg-orange-50 focus:ring-1 focus:ring-orange-300 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">הכנסה חודשית</label>
            <input
              value={secondaryIncome}
              onChange={(e) => setSecondaryIncome(formatNumber(e.target.value))}
              placeholder="₪"
              className="w-full border rounded-lg p-2 focus:bg-orange-50 focus:ring-1 focus:ring-orange-300 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">הלוואה חודשית (החזר)</label>
            <input
              value={secondaryLoans}
              onChange={(e) => setSecondaryLoans(formatNumber(e.target.value))}
              placeholder="₪"
              className="w-full border rounded-lg p-2 focus:bg-orange-50 focus:ring-1 focus:ring-orange-300 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">יתרת הלוואה</label>
            <input
              value={secondaryLoanBalance}
              onChange={(e) => setSecondaryLoanBalance(formatNumber(e.target.value))}
              placeholder="₪"
              className="w-full border rounded-lg p-2 focus:bg-orange-50 focus:ring-1 focus:ring-orange-300 outline-none"
            />
          </div>
        </div>

        {/* ערבים */}
        <div className="space-y-3">
          <div className="font-bold text-lg border-b pb-1">ערבים (50%)</div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">גיל</label>
            <input
              value={guarantorAge}
              onChange={(e) => setGuarantorAge(e.target.value)}
              placeholder="גיל"
              className="w-full border rounded-lg p-2 focus:bg-orange-50 focus:ring-1 focus:ring-orange-300 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">הכנסה חודשית</label>
            <input
              value={guarantorIncome}
              onChange={(e) => setGuarantorIncome(formatNumber(e.target.value))}
              placeholder="₪"
              className="w-full border rounded-lg p-2 focus:bg-orange-50 focus:ring-1 focus:ring-orange-300 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">הלוואה חודשית (החזר)</label>
            <input
              value={guarantorLoans}
              onChange={(e) => setGuarantorLoans(formatNumber(e.target.value))}
              placeholder="₪"
              className="w-full border rounded-lg p-2 focus:bg-orange-50 focus:ring-1 focus:ring-orange-300 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">יתרת הלוואה</label>
            <input
              value={guarantorLoanBalance}
              onChange={(e) => setGuarantorLoanBalance(formatNumber(e.target.value))}
              placeholder="₪"
              className="w-full border rounded-lg p-2 focus:bg-orange-50 focus:ring-1 focus:ring-orange-300 outline-none"
            />
          </div>
        </div>

        {/* סיכום */}
        <div className="space-y-3">
          <div className="font-bold text-lg border-b pb-1">סיכום כולל</div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">סה״כ גיל</label>
            <div className="border rounded-lg p-2 bg-white text-center text-gray-400">—</div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">סה״כ הכנסה מוכרת</label>
            <div className="border rounded-lg p-2 bg-white text-center font-semibold text-green-700">
              {totalIncome.toLocaleString()} ₪
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">סה״כ החזר הלוואות</label>
            <div className="border rounded-lg p-2 bg-white text-center font-semibold text-red-600">
              {totalLoans.toLocaleString()} ₪
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">סה״כ יתרת הלוואות</label>
            <div className="border rounded-lg p-2 bg-white text-center font-semibold text-red-600">
              {totalLoanBalance.toLocaleString()} ₪
            </div>
          </div>
        </div>
      </div>

      {/* ===== אזור סיכום מתקדם ===== */}
      <div className="bg-gray-50 rounded-2xl p-6 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* טור 1 – אחוזי מימון / הון עצמי */}
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3 h-fit">
            <h3 className="font-bold text-base text-gray-800">אחוזי מימון</h3>
            <div className="flex justify-between text-sm">
              <span>שווי נכס</span>
              <span className="font-semibold">{asset.toLocaleString()} ₪</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>הון עצמי</span>
              <span className="font-semibold">{equityAmount.toLocaleString()} ₪</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>אחוז הון עצמי</span>
              <span className="font-bold">{asset > 0 ? ((equityAmount / asset) * 100).toFixed(1) : 0}%</span>
            </div>
            <div className="pt-2 border-t text-xs text-gray-600 flex justify-between">
              <span>מימון מקסימלי: {PURPOSES[purpose].maxLtv}%</span>
              <span className="font-bold">{maxMortgageAllowed.toLocaleString()} ₪</span>
            </div>
            <div className="pt-2 border-t text-sm flex justify-between font-semibold">
              <span>משכנתא מבוקשת:</span>
              <span>{requestedMortgage.toLocaleString()} ₪</span>
            </div>
          </div>

          {/* טור 2 – יחס החזר (מעודכן לפי רגולציית בנק ישראל) */}
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3 h-fit">
            <h3 className="font-bold text-base text-gray-800">יחס החזר ותקרות תשלום</h3>
            <div className="flex justify-between text-sm font-bold">
              <span>הכנסה כוללת</span>
              <span>{totalIncome.toLocaleString()} ₪</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>הלוואות קיימות</span>
              <span>{totalLoans.toLocaleString()} ₪</span>
            </div>
            <div className="flex justify-between text-sm text-green-600 pt-2 border-t">
              <span>תקרה מומלצת למשכנתא (35%)</span>
              <span>{Math.round(Math.max((totalIncome * 0.35) - totalLoans, 0)).toLocaleString()} ₪</span>
            </div>
            <div className="flex justify-between text-sm text-red-600">
              <span>תקרה מקסימלית למשכנתא (40%)</span>
              <span>{Math.round(Math.max((totalIncome * 0.40) - totalLoans, 0)).toLocaleString()} ₪</span>
            </div>
            <div className="pt-2 border-t text-xs text-gray-500">
- מחושב לפי רגולציית בנק ישראל החדשה: סך ההחזרים (משכנתא+הלוואות) מתוך ההכנסה.
            </div>
          </div>

          {/* טור 3 – טבלת מסלולי הלוואה דינמית */}
          <div className="bg-white rounded-xl p-4 shadow-sm lg:col-span-3">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-gray-800">מסלולי משכנתא / הלוואות</h3>
              <button 
                onClick={addTrack}
                className="bg-orange-100 text-orange-700 px-3 py-1 rounded text-sm font-semibold hover:bg-orange-200 transition"
              >
                + הוסף מסלול
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-100 text-gray-600">
                  <tr>
                    <th className="p-2 rounded-r-lg">שם המסלול</th>
                    <th className="p-2">סכום (₪)</th>
                    <th className="p-2">תקופה (חודשים)</th>
                    <th className="p-2">ריבית שנתית (%)</th>
                    <th className="p-2">החזר חודשי</th>
                    <th className="p-2 rounded-l-lg"></th>
                  </tr>
                </thead>
                <tbody>
                  {tracks.map((track) => {
                    const payment = calculateTrackPmt(track.amount, track.months, track.interest);
                    return (
                      <tr key={track.id} className="border-b last:border-0">
                        <td className="p-2">
                          <input
                            type="text"
                            value={track.name}
                            onChange={(e) => updateTrack(track.id, "name", e.target.value)}
                            placeholder="שם מסלול..."
                            className="w-full border rounded p-1"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={track.amount}
                            onChange={(e) => updateTrack(track.id, "amount", formatNumber(e.target.value))}
                            placeholder="₪"
                            className="w-24 border rounded p-1"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={track.months}
                            onChange={(e) => updateTrack(track.id, "months", e.target.value)}
                            className="w-20 border rounded p-1"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            step="0.1"
                            value={track.interest}
                            onChange={(e) => updateTrack(track.id, "interest", e.target.value)}
                            className="w-20 border rounded p-1"
                          />
                        </td>
                        <td className="p-2 font-semibold">
                          {payment > 0 ? Math.round(payment).toLocaleString() : "0"} ₪
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => removeTrack(track.id)}
                            className="text-red-500 hover:text-red-700 font-bold"
                            title="מחק מסלול"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-4 border-t flex justify-end gap-8 text-sm">
              <div className="flex flex-col">
                <span className="text-gray-500">סה״כ סכום מסלולים:</span>
                <span className="font-bold text-lg">{totalTracksAmount.toLocaleString()} ₪</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500">סה״כ החזר חודשי צפוי:</span>
                <span className="font-bold text-lg text-orange-600">{Math.round(totalTracksPayment).toLocaleString()} ₪</span>
              </div>
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
          className="px-5 py-2 rounded-lg border border-red-300 text-red-600 font-semibold hover:bg-red-50 transition"
        >
          ניקוי טופס
        </button>
      </div>

    </div>
  );
}




// import { useState ,ReactNode,  } from "react";
// import BalloonLoanModal from "./BalloonLoanModal"
// import LoanConsolidation from "./LoanConsolidationModal";

// import Modal from "./Modal";
// import ReverseMortgageCalculator from "../home/calculators/reverse_calculator/ReverseMortgageCalculator";





// type Purpose =
//   | "single"
//   | "replacement"
//   | "investment"
//   | "any"
//   | "self_build";

// const PURPOSES: Record<
//   Purpose,
//   { label: string; maxLtv: number }
// > = {
//   single: { label: "דירה יחידה", maxLtv: 75 },
//   replacement: { label: "דירה חלופית", maxLtv: 70 },
//   investment: { label: "דירה נוספת (השקעה)", maxLtv: 50 },
//   any: { label: "כל מטרה", maxLtv: 50 },
//   self_build: { label: "בניה עצמית", maxLtv: 70 },
// };

// export default function AbilityCalculator() {
//   const [purpose, setPurpose] = useState<Purpose>("single");

//   const [mainAge, setMainAge] = useState("");
//   const [secondaryAge, setSecondaryAge] = useState("");

//   const [mainIncome, setMainIncome] = useState("");
//   const [secondaryIncome, setSecondaryIncome] = useState("");

//   const [mainLoans, setMainLoans] = useState("");
//   const [secondaryLoans, setSecondaryLoans] = useState("");

//   const [guarantorAge, setGuarantorAge] = useState("");
//   const [guarantorIncome, setGuarantorIncome] = useState("");
//   const [guarantorLoans, setGuarantorLoans] = useState("");






//   const [assetValue, setAssetValue] = useState("");
//   const [equity, setEquity] = useState("");

//   // מדינות קלט
// const [months, setMonths] = useState(360);       // ברירת מחדל 360 חודשים
// const [interest, setInterest] = useState(4.8);   // ברירת מחדל 4.8%

// //  פתיחת מודלים
// const [isLoanConsolidationOpen, setIsLoanConsolidationOpen] = useState(false);
// const [isModalOpen, setIsModalOpen] = useState(false);

// // ה-State הזה יחזיק את הקומפוננטה שתרצה להציג כרגע במודל
//   const [modalContent, setModalContent] = useState<ReactNode | null>(null);

//   // פונקציית עזר לפתיחת המודל עם תוכן ספציפי
//   const openModalWith = (content: ReactNode) => {
//     setModalContent(content);
//     setIsModalOpen(true);
//   };

//   // פונקציה לסגירת המודל ואיפוס התוכן
//   const closeModal = () => {
//     setIsModalOpen(false);
//     setModalContent(null);
//   };




//  /* ===== מפריד אלפים ===== */

// const formatNumber = (value: string) =>
//   value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// const parseNumber = (value: string) =>
//   Number(value.replace(/,/g, ""));

// const [isOpen, setIsOpen] = useState(false);

// /* ===== איפוס טופס  ===== */

// const resetForm = () => {
//   setPurpose("single");

//   setMainAge("");
//   setSecondaryAge("");

//   setMainIncome("");
//   setSecondaryIncome("");

//   setMainLoans("");
//   setSecondaryLoans("");

//   setAssetValue("");
//   setEquity("");

//   setMonths(360);
//   setInterest(4.8);

//   setGuarantorAge("");
//   setGuarantorIncome("");
//   setGuarantorLoans("");

// };



  
//   /* ===== חישובים ===== */

// const asset = parseNumber(assetValue || "0");
// const equityAmount = parseNumber(equity || "0");

// const guarantorIncomeAmount =
//   parseNumber(guarantorIncome || "0");

// const totalIncome =
//   parseNumber(mainIncome || "0") +
//   parseNumber(secondaryIncome || "0") +
//   (guarantorIncomeAmount * 0.5);

// const totalLoans =
//   parseNumber(mainLoans || "0") +
//   parseNumber(secondaryLoans || "0") +
//   parseNumber(guarantorLoans || "0");

//   const maxMortgageAllowed =
//     asset * (PURPOSES[purpose].maxLtv / 100);

//   const requestedMortgage = Math.max(
//     asset - equityAmount,
//     0
//   );

//   const equityPercent =
//   asset > 0 ? (equityAmount / asset) * 100 : 0;


//   const isWithinLtv =
//     requestedMortgage <= maxMortgageAllowed;


// // חישוב החזר חודשי (שפיצר)

// const freeIncome = totalIncome - totalLoans;

// const monthlyRate = interest / 100 / 12;  // ריבית חודשית
// const monthlyPayment =
//   months > 0
//     ? requestedMortgage * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)))
//     : 0;

// const crmText = [
//   purpose && `מטרת המשכנתא:${PURPOSES[purpose].label}`,
//   asset > 0 && `שווי נכס:${asset.toLocaleString()} ₪`,
//   equityAmount > 0 && `הון עצמי:${equityAmount.toLocaleString()} ₪`,
//   freeIncome > 0 && `הכנסה פנויה:${freeIncome.toLocaleString()} ₪`,
//   mainAge && `גיל1:${mainAge}`,
//   secondaryAge && `גיל2:${secondaryAge}`,
//   guarantorAge && `גיל ערב:${guarantorAge}`,
//   guarantorIncome && `הכנסת ערב:${guarantorIncome}`,
//   ]
//   .filter(Boolean)
//   .join("#");


//   /* ===== UI ===== */

//   return (
//     <div className="max-w-6xl mx-auto p-6 bg-white rounded-2xl shadow-xl space-y-6">

//       {/* שורה ראשונה – מטרה / שווי נכס / הון עצמי */}
//       <div className="grid grid-cols-3 gap-4">

//         {/* מטרת משכנתא */}
//         <div>
//           <label className="block font-semibold mb-1">
//             מטרת המשכנתא
//           </label>
//           <select
//             value={purpose}
//             onChange={(e) =>
//               setPurpose(e.target.value as Purpose)
//             }
//             className="w-full border rounded-lg p-2 focus:bg-orange-50 last:focus:border-orange-400 focus:ring-1 focus:ring-orange-300 focus:outline-none "
//           >
//             {Object.entries(PURPOSES).map(
//               ([key, val]) => (
//                 <option key={key} value={key}>
//                   {val.label}
//                 </option>
//               )
//             )}
//           </select>
//           <div className="text-xs text-gray-600 mt-1">
//             אחוז מימון מקסימלי:{" "}
//             <span className="font-bold">
//               {PURPOSES[purpose].maxLtv}%
//             </span>
//           </div>
//         </div>

//         {/* שווי נכס */}
//         <div>
//           <label className="block font-semibold mb-1">
//             שווי נכס
//           </label>
//           <input
//             type="text"
//             value={assetValue}
//             onChange={(e) =>
//                         setAssetValue(formatNumber(e.target.value))
//                     }
//             placeholder="₪"
//             className="w-full border rounded-lg p-2 focus:bg-orange-50 last:focus:border-orange-400 focus:ring-1 focus:ring-orange-300 focus:outline-none "
//           />
// {/* כפתורי מסלולים נוספים */}
// {/* כפתורי מסלולים נוספים */}
// <div className="flex gap-1.5 mt-2">

//   <button
   
//    onClick={() => setIsLoanConsolidationOpen(true)}
//    type="button"
//     className="
//       px-2.5 py-1
//       rounded-lg
//       bg-green-50
//       border border-green-300
//       text-green-700
//       font-semibold
//       text-xs
//       hover:bg-green-400
//       hover:text-white
//       transition-all
//       duration-200
//     "
//   >
//     איחוד הלוואות
//   </button>


//   <button
//     type="button"
//     onClick={() => openModalWith(<ReverseMortgageCalculator />)}
//     className="
//       px-2.5 py-1
//       rounded-lg
//       bg-green-50
//       border border-green-300
//       text-green-700
//       font-semibold
//       text-xs
//       hover:bg-green-400
//       hover:text-white
//       transition-all
//       duration-200
//     "
//   >
//     משכנתא הפוכה
//   </button>


//   <button
//     type="button"
    
    
//     className="
//       px-2.5 py-1
//       rounded-lg
//       bg-green-50
//       border border-green-300
//       text-green-700
//       font-semibold
//       text-xs
//       hover:bg-green-400
//       hover:text-white
//       transition-all
//       duration-200
//     "
//   >
//     גיוס כל מטרה
//   </button>

// </div>








//         </div>

//       {/* הון עצמי */}
//         <div>
//         <label className="block font-semibold mb-1">
//             הון עצמי
//         </label>

//         <input
//             type="text"
//             value={equity}
//             onChange={(e) => setEquity(formatNumber(e.target.value))}
//             placeholder="₪"
//             className="w-full border rounded-lg p-2 focus:bg-orange-50 last:focus:border-orange-400 focus:ring-1 focus:ring-orange-300 focus:outline-none "
//         />

//         {asset > 0 && equityAmount > 0 && (
//             <div className="text-xs mt-1 text-gray-600">
//             אחוז הון עצמי:{" "}
//             <span className="font-bold">
//                 {equityPercent.toFixed(1)}%
//             </span>
//             </div>
//         )}


// {asset > 0 && (
//   <div className="text-xs mt-2 text-gray-600 space-y-1">

//     {/* אחוז הון עצמי מינימלי */}
//     <div className="flex justify-between">
//       <span>
//         אחוז הון עצמי מינימלי:
//       </span>

//       <span className="font-bold">
//         {(100 - PURPOSES[purpose].maxLtv)}%
//       </span>
//     </div>


//     {/* סכום הון עצמי מינימלי */}
//     <div className="flex justify-between">
//       <span>
//         הון עצמי מינימלי:
//       </span>

//       <span className="font-bold">
//         {(
//           asset *
//           ((100 - PURPOSES[purpose].maxLtv) / 100)
//         ).toLocaleString()} ₪
//       </span>
//     </div>


//     {/* השלמה */}
//     <div className="flex justify-between text-orange-600">
//       <span>
//         השלמת הון עצמי:
//       </span>

//       <span className="font-bold">
//         {Math.max(
//           (
//             asset *
//             ((100 - PURPOSES[purpose].maxLtv) / 100)
//           ) - equityAmount,
//           0
//         ).toLocaleString()} ₪
//       </span>
//     </div>

//   </div>
// )}










//         </div>

//       </div>


//       {/* טבלה */}
//       <div className="grid grid-cols-4 gap-4 text-sm">

//         <div className="font-bold">בן זוג ראשי</div>
//         <div className="font-bold">בן זוג משני</div>
//         <div className="font-bold">ערבים (מחושבת לפי 50%)  </div>
//         <div className="font-bold">סיכום</div>

//         {/* גיל */}
//         <input
//           value={mainAge}
//           onChange={(e) => setMainAge(e.target.value)}
//           placeholder="גיל"
//           className="w-full border rounded-lg p-2 focus:bg-orange-50 last:focus:border-orange-400 focus:ring-1 focus:ring-orange-300 focus:outline-none "
//         />
//         <input
//           value={secondaryAge}
//           onChange={(e) =>
//             setSecondaryAge(e.target.value)
//           }
//           placeholder="גיל"
//           className="w-full border rounded-lg p-2 focus:bg-orange-50 last:focus:border-orange-400 focus:ring-1 focus:ring-orange-300 focus:outline-none "
//         />
//        <input
//           value={guarantorAge}
//           onChange={(e)=>setGuarantorAge(e.target.value)}
//           placeholder="גיל"
//           className="w-full border rounded-lg p-2 focus:bg-orange-50"
//         />
       
       
//         <div className="border rounded p-2 bg-gray-50 text-center">
//           —
//         </div>








//         {/* הכנסות */}
//         <input
//           value={mainIncome}
//           onChange={(e) => setMainIncome(formatNumber(e.target.value))}           
//           placeholder="הכנסה חודשית"
//           className="w-full border rounded-lg p-2 focus:bg-orange-50 last:focus:border-orange-400 focus:ring-1 focus:ring-orange-300 focus:outline-none "
//         />
//         <input
//           value={secondaryIncome}
//           onChange={(e) => setSecondaryIncome(formatNumber(e.target.value))}
//           placeholder="הכנסה חודשית"
//           className="w-full border rounded-lg p-2 focus:bg-orange-50 last:focus:border-orange-400 focus:ring-1 focus:ring-orange-300 focus:outline-none "
//         />
//         <input
//           value={guarantorIncome}
//           onChange={(e)=>
//             setGuarantorIncome(formatNumber(e.target.value))
//           }
//           placeholder="הכנסה חודשית"
//           className="w-full border rounded-lg p-2 focus:bg-orange-50"
//         />








//         <div className="border rounded p-2 bg-gray-50 text-center font-semibold">
//           {totalIncome.toLocaleString()} ₪
//         </div>

//         {/* הלוואות */}
//         <input
//           value={mainLoans}
//           onChange={(e) => setMainLoans(formatNumber(e.target.value))}
//           placeholder="הלוואות"
//           className="w-full border rounded-lg p-2 focus:bg-orange-50 last:focus:border-orange-400 focus:ring-1 focus:ring-orange-300 focus:outline-none "
//         />
//         <input
//           value={secondaryLoans}
//           onChange={(e) => setSecondaryLoans(formatNumber(e.target.value))}
//           placeholder="הלוואות"
//           className="w-full border rounded-lg p-2 focus:bg-orange-50 last:focus:border-orange-400 focus:ring-1 focus:ring-orange-300 focus:outline-none "
//         />
//         <input
//           value={guarantorLoans}
//           onChange={(e)=>
//             setGuarantorLoans(formatNumber(e.target.value))
//           }
//           placeholder="הלוואות"
//           className="w-full border rounded-lg p-2 focus:bg-orange-50"
//         />


//         <div className="border rounded p-2 bg-gray-50 text-center font-semibold">
//           {totalLoans.toLocaleString()} ₪
//         </div>
//       </div>

    

//     {/* ===== אזור סיכום מתקדם ===== */}
//     <div className="bg-gray-50 rounded-2xl p-6 mt-6">
//     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        
//         {/* טור 1 – אחוזי מימון / הון עצמי */}
//         <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
//         <h3 className="font-bold text-base text-gray-800">
//             אחוזי מימון
//         </h3>

//         {/* שווי נכס */}
//         <div className="flex justify-between text-sm">
//             <span>שווי נכס</span>
//             <span className="font-semibold">
//             {asset.toLocaleString()} ₪
//             </span>
//         </div>

//         {/* הון עצמי */}
//         <div className="flex justify-between text-sm">
//             <span>הון עצמי</span>
//             <span className="font-semibold">
//             {equityAmount.toLocaleString()} ₪
//             </span>
//         </div>

//         {/* אחוז הון עצמי */}
//         <div className="flex justify-between text-sm">
//             <span>אחוז הון עצמי</span>
//             <span className="font-bold">
//             {asset > 0 ? ((equityAmount / asset) * 100).toFixed(1) : 0}%
//             </span>
//         </div>

//         {/* שורת אחוז מימון + סכום מקסימלי */}
//         <div className="pt-2 border-t text-xs text-gray-600 flex justify-between">
//             <span>
//             מימון מקסימלי: {PURPOSES[purpose].maxLtv}%
//             </span>
//             <span className="font-bold">
//             {maxMortgageAllowed.toLocaleString()} ₪
//             </span>
//         </div>

//         {/* משכנתא מבוקשת */}
//         <div className="pt-2 border-t text-sm flex justify-between font-semibold">
//             <span>משכנתא מבוקשת:</span>
//             <span>{requestedMortgage.toLocaleString()} ₪</span>
//         </div>
//         </div>

//         {/* טור 2 – הכנסה פנויה */}
//         <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
//         <h3 className="font-bold text-base text-gray-800">
//             הכנסה פנויה
//         </h3>

//         {/* הכנסה פנויה */}
//         <div className="flex justify-between text-sm font-bold">
//             <span>הכנסה פנויה</span>
//             <span>
//             {(totalIncome - totalLoans).toLocaleString()} ₪
//             </span>
//         </div>

//         {/* תקרת תשלום מומלצת 35% */}
//         <div className="flex justify-between text-sm text-green-600">
//             <span>תקרת תשלום מומלצת (35%)</span>
//             <span>
//             {Math.round((totalIncome - totalLoans) * 0.35).toLocaleString()} ₪
//             </span>
//         </div>

//         {/* תקרת תשלום מקסימלית 40% */}
//         <div className="flex justify-between text-sm text-red-600">
//             <span>תקרת תשלום מקסימלית (40%)</span>
//             <span>
//             {Math.round((totalIncome - totalLoans) * 0.4).toLocaleString()} ₪
//             </span>
//         </div>

//         <div className="pt-2 border-t text-xs text-gray-500">
//             יחס החזר יראה כמה ניתן להקצות למשכנתא בהתאם להכנסה הפנויה
//         </div>
//         </div>

//         {/* טור 3 – מחשבון תשלום משכנתא */}
//         <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
//         <h3 className="font-bold text-base text-gray-800">
//             תשלום משכנתא
//         </h3>

//         {/* סכום משכנתא */}
//         <div className="flex justify-between text-sm">
//             <span>סכום משכנתא</span>
//             <span className="font-semibold">{requestedMortgage.toLocaleString()} ₪</span>
//         </div>

//         {/* מספר חודשים */}
//         <div className="flex justify-between text-sm items-center">
//             <span>מספר חודשים</span>
//             <input
//             type="number"
//             value={months}
//             onChange={(e) => setMonths(Number(e.target.value))}
//             className="border rounded p-1 w-20 text-right"
//             />
//         </div>

//         {/* ריבית שנתית */}
//         <div className="flex justify-between text-sm items-center">
//             <span>ריבית שנתית (%)</span>
//             <input
//             type="number"
//             step="0.01"
//             value={interest}
//             onChange={(e) => setInterest(Number(e.target.value))}
//             className="border rounded p-1 w-20 text-right"
//             />
//         </div>

//         {/* החזר חודשי */}
//         <div className="pt-2 border-t flex justify-between font-bold text-sm">
//             <span>החזר חודשי</span>
//             <span>
//             {monthlyPayment > 0 ? monthlyPayment.toLocaleString() : "—"} ₪
//             </span>
//         </div>

//         <div className="text-xs text-gray-500">
//             חישוב לפי שפיצר (תשלום קבוע חודשי)
//         </div>
//         </div>

//     </div>

//         {/* שדה מוכן להעתקה ל-CRM */}
//         {crmText && (
//         <div className="mt-6">
//             <label className="block font-semibold mb-1 text-sm">
//             סיכום להעתקה ל-CRM
//             </label>

//             <textarea
//             readOnly
//             value={crmText}
//             rows={4}
//             className="w-full border rounded-lg p-3 text-sm bg-gray-50 focus:outline-none"
//             onClick={(e) => e.currentTarget.select()}
//             />
//         </div>
//         )}



//     </div>

//             <div className="flex justify-end mt-6">
//             <button
//                 type="button"
//                 onClick={resetForm}
//                 className="px-5 py-2 rounded-lg border border-red-300
//                         text-red-600 font-semibold
//                         hover:bg-red-50 transition"
//             >
//                 ניקוי טופס
//             </button>
           
           
             
           
           
           
           
           
//             </div>



//      <BalloonLoanModal
//         isOpen={isOpen}
//         onClose={() => setIsOpen(false)}
//       />

//       {/* שימוש במודל הכללי */}
//       <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
//         <ReverseMortgageCalculator />
//       </Modal>




//     </div>
//   );
// }



