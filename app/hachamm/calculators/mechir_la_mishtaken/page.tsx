"use client"

import  { useState } from 'react';


type SettlementGrant = {
  name: string;
  grant: number;
};

const settlements: SettlementGrant[] = [
  { name: 'אופקים', grant: 60000 },
  { name: 'אילת', grant: 40000 },
  { name: 'אשקלון', grant: 40000 },
  { name: 'בית שאן', grant: 60000 },
  { name: 'דימונה', grant: 60000 },
  { name: 'חריש', grant: 40000 },
  { name: 'טבריה', grant: 60000 },
  { name: 'ירוחם', grant: 60000 },
  { name: 'נהריה', grant: 40000 },
  { name: 'נצרת', grant: 60000 },
  { name: 'נוף הגליל (נצרת עילית)', grant: 60000 },
  { name: 'נתיבות', grant: 60000 },
  { name: 'עכו', grant: 40000 },
  { name: 'עפולה', grant: 40000 },
  { name: 'מצפה רמון', grant: 60000 },
  { name: 'קריית מלאכי', grant: 40000 },
  { name: 'שלומי', grant: 40000 },
];







const GRANT_CEILING = 1800000;



const PriceGrantSimulator = () => {
  const [contractPrice, setContractPrice] = useState<number | ''>('');
  const [propertyValue, setPropertyValue] = useState<number | ''>('');


  const [hasGrant, setHasGrant] = useState(false);
  const [selected, setSelected] = useState<{ name: string; grant: number } | null>(null);
 
  const [monthlyIncome, setMonthlyIncome] = useState<number | ''>('');
  const [interestRate, setInterestRate] = useState<number>(5);
  const [loanMonths, setLoanMonths] = useState<number | ''>(360);
  const [ownEquity, setOwnEquity] = useState<number | ''>('');





  const minimumEquityThreshold = hasGrant ? 60000 : 100000;



  const numericContractPrice = typeof contractPrice === 'number' ? contractPrice : 0;
  const numericPropertyValue = typeof propertyValue === 'number' ? propertyValue : 0;


  const priceForCalculation =
  numericPropertyValue <= GRANT_CEILING
    ? numericPropertyValue
    : Math.max(GRANT_CEILING, numericContractPrice);

    const clientFundingBeforeGrant = numericContractPrice - priceForCalculation * 0.75;

    const grantAmount = hasGrant && selected ? selected.grant : 0;

    const clientFundingAfterGrant = clientFundingBeforeGrant - grantAmount;
    const requestedMortgage = contractPrice && ownEquity !== '' ? Number(contractPrice) - Number(ownEquity) : '';
  
    
    const safeContractPrice = typeof contractPrice === 'number' ? contractPrice : 0;
 

    const minEquityCeiling = grantAmount > 0 ? 60000 : 100000;
    const minEquity = Math.max(minEquityCeiling, clientFundingAfterGrant);
    const minimumEquity = Math.max(minEquityCeiling, clientFundingAfterGrant);
   //  const minimumEquity = Math.max(minEquityCeiling, clientFundingAfterGrant);
   
   const maxMortgage = safeContractPrice - minimumEquity;
  // פונקציה לחישוב תשלום חודשי
    function calculateMonthlyPayment(
      loanAmount: number,
      annualInterestRate: number,
      totalMonths: number
    ): number {
      if (loanAmount <= 0 || annualInterestRate <= 0 || totalMonths <= 0) return 0;

      const monthlyRate = Math.pow(1 + annualInterestRate / 100, 1 / 12) - 1; // ריבית חודשית מחושבת בחזקה
      const numerator = monthlyRate * Math.pow(1 + monthlyRate, totalMonths);
      const denominator = Math.pow(1 + monthlyRate, totalMonths) - 1;
      return loanAmount * (numerator / denominator);
    }
  
 
  const formatNumber = (value: number | '') => {
    return value !== '' ? value.toLocaleString() : '';
  };

  const parseInput = (value: string) => {
    const numeric = Number(value.replace(/,/g, ''));
    return isNaN(numeric) ? '' : numeric;
  };

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const found = settlements.find((s) => s.name === e.target.value);
    setSelected(found ?? null);
  }

  monthlyIncome
  //תשלום חודשי 
      const annualRate = interestRate / 100;
      const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
      
      const isValidMortgage = typeof requestedMortgage === 'number' && requestedMortgage > 0;
      const isValidMonths = typeof loanMonths === 'number' && loanMonths > 0;
      
      const monthlyPayment = isValidMortgage && isValidMonths
        ? (monthlyRate === 0
            ? requestedMortgage / loanMonths
            : requestedMortgage * (monthlyRate * Math.pow(1 + monthlyRate, loanMonths)) / (Math.pow(1 + monthlyRate, loanMonths) - 1)
          )
        : 0;
      
      const formattedMonthlyPayment = monthlyPayment.toLocaleString('en-US', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
 //תשלום חודשי end

  const showWarning =
    contractPrice !== '' &&
    propertyValue !== '' &&
    propertyValue < contractPrice;

  return (
   <div className="flex justify-center items-start min-h-screen bg-gradient-to-b from-[#f8fafc] to-[#e6eff3] pt-10 pb-20 px-2">
  <div className="relative w-full max-w-[500px]">

    {/* === קופסת הסימולטור המעוצבת === */}
    <div
      className="relative rounded-2xl overflow-hidden p-6 sm:p-8 z-10"
      style={{
        background: "linear-gradient(180deg, #1d75a1 0%, #15516f 100%)",
        boxShadow:
          "0 18px 28px rgba(0,0,0,0.3), inset 0 2px 8px rgba(255,255,255,0.15)",
      }}
    >
      {/* פס מבריק עליון */}
      <div className="absolute top-0 left-0 w-full h-[10px] bg-white/20"></div>

      {/* ===== כותרת ===== */}
      <h2 className="text-2xl sm:text-3xl font-extrabold text-center drop-shadow-lg text-white mb-3">
        סימולטור דירה בהנחה
      </h2>
      <p className="text-sm text-white/80 font-medium text-center mb-6">
        מחיר למשתכן / דירה בהנחה
      </p>

      {/* ===== כל שדות הקלט ===== */}
      <div className="space-y-5 text-white direction-rtl">

        {/* מחיר חוזה */}
        <div>
          <label className="block text-sm mb-1 text-slate-100">מחיר חוזה</label>
          <input
            type="text"
            inputMode="numeric"
            value={formatNumber(contractPrice)}
            onChange={(e) => setContractPrice(parseInput(e.target.value))}
            placeholder="₪ 0"
            className="w-full rounded-md p-3 text-gray-900 bg-white shadow-[inset_0_3px_5px_rgba(0,0,0,0.25),0_4px_8px_rgba(0,0,0,0.35)] focus:bg-orange-50 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
          />
        </div>

        {/* שווי נכס */}
        <div>
          <label className="block text-sm mb-1 text-slate-100">שווי נכס (שמאי)</label>
          <input
            type="text"
            inputMode="numeric"
            value={formatNumber(propertyValue)}
            onChange={(e) => setPropertyValue(parseInput(e.target.value))}
            placeholder="₪ 0"
            className="w-full rounded-md p-3 text-gray-900 bg-white shadow-[inset_0_3px_5px_rgba(0,0,0,0.25),0_4px_8px_rgba(0,0,0,0.35)] focus:bg-orange-50 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
          />

          {showWarning && (
            <div className="text-red-300 text-xs font-medium mt-1 animate-pulse">
              שווי נכס חייב להיות גבוה או שווה למחיר חוזה
            </div>
          )}
        </div>

        {/* האם קיים מענק */}
        <div className="pt-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-100">
            <input
              type="checkbox"
              checked={hasGrant}
              onChange={(e) => {
                setHasGrant(e.target.checked);
                if (!e.target.checked) setSelected(null);
              }}
              className="rounded border-gray-300 text-orange-300 focus:ring-2 focus:ring-orange-300"
            />
            האם קיים מענק מקום?
          </label>
        </div>

        {/* בחירת יישוב + גובה מענק */}
        {hasGrant && (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-4 rounded-xl space-y-4">
            <div>
              <label className="block mb-1 text-sm text-slate-100">בחר יישוב</label>
              <select
                onChange={handleSelect}
                defaultValue=""
                className="w-full p-3 rounded-md bg-white text-gray-900 shadow-[inset_0_3px_5px_rgba(0,0,0,0.25),0_3px_6px_rgba(0,0,0,0.25)] focus:ring-2 focus:ring-orange-300"
              >
                <option value="" disabled>-- נא לבחור יישוב --</option>
                {settlements.map((s) => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 text-sm text-slate-100">סכום המענק</label>
              <input
                readOnly
                value={grantAmount ? `${grantAmount.toLocaleString()} ₪` : ""}
                className="w-full p-3 rounded-md bg-gray-100 text-gray-700 shadow-inner"
              />
            </div>
          </div>
        )}

        {/* נתוני עזר מינימום */}
        {numericContractPrice !== 0 && numericPropertyValue !== 0 && (
          <div className="bg-white/10 rounded-xl p-4 border border-white/20 backdrop-blur-sm">
            <h3 className="text-sm font-bold mb-2">נתוני עזר</h3>
            <p className="text-xs">מינימום הון עצמי: {minimumEquity.toLocaleString()} ₪</p>
            <p className="text-xs">משכנתא מקסימלית: {maxMortgage.toLocaleString()} ₪</p>
          </div>
        )}

        {/* יכולת החזר */}
        <div className="pt-6">
          <p className="text-xl font-bold text-orange-300 mb-4 text-center">
            עכשיו נבדוק את יכולת ההחזר 🔥
          </p>

          {/* הכנסה חודשית */}
          <div className="mb-4">
            <label className="block text-sm mb-1 text-slate-100">הכנסה חודשית</label>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumber(monthlyIncome)}
              onChange={(e) => setMonthlyIncome(parseInput(e.target.value))}
              className="w-full rounded-md p-3 bg-white text-gray-900 shadow-[inset_0_3px_5px_rgba(0,0,0,0.25),0_3px_6px_rgba(0,0,0,0.25)] focus:ring-2 focus:ring-orange-300"
            />
          </div>

          {/* הון עצמי + משכנתא מבוקשת */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1 text-slate-100">הון עצמי</label>
              <input
                type="text"
                inputMode="numeric"
                value={formatNumber(ownEquity)}
                onChange={(e) => setOwnEquity(parseInput(e.target.value))}
                className={`w-full rounded-md p-3 bg-white text-gray-900 shadow-[inset_0_3px_5px_rgba(0,0,0,0.25),0_3px_6px_rgba(0,0,0,0.25)] focus:ring-2 transition ${
                  ownEquity !== "" && ownEquity < minimumEquity
                    ? "focus:ring-red-400 border-red-500"
                    : "focus:ring-orange-300"
                }`}
              />
              {ownEquity !== "" && ownEquity < minimumEquity && (
                <div className="text-red-300 text-xs mt-1 animate-pulse">
                  הון עצמי חייב להיות לפחות {minimumEquity.toLocaleString()} ₪
                </div>
              )}
            </div>

            {/* משכנתא מבוקשת */}
            <div>
              <label className="block text-sm mb-1 text-slate-100">משכנתא מבוקשת</label>
              <input
                readOnly
                value={
                  contractPrice && ownEquity !== ""
                    ? formatNumber(contractPrice - ownEquity)
                    : ""
                }
                className="w-full rounded-md p-3 bg-gray-100 text-gray-800 shadow-inner"
              />
            </div>
          </div>

          {/* ריבית + חודשי הלוואה */}
          <div className="grid grid-cols-2 gap-4 mt-5">
            <div>
              <label className="block text-sm mb-1 text-slate-100">ריבית (%)</label>
              <input
                type="number"
                step="0.01"
                value={interestRate}
                onChange={(e) => setInterestRate(parseFloat(e.target.value))}
                className="w-full p-3 rounded-md bg-white text-gray-900 shadow-[inset_0_3px_5px_rgba(0,0,0,0.25),0_3px_6px_rgba(0,0,0,0.25)] focus:ring-2 focus:ring-orange-300"
              />
            </div>

            <div>
              <label className="block text-sm mb-1 text-slate-100">מספר חודשי הלוואה</label>
              <input
                type="number"
                value={loanMonths}
                onChange={(e) => setLoanMonths(Number(e.target.value))}
                className="w-full p-3 rounded-md bg-white text-gray-900 shadow-[inset_0_3px_5px_rgba(0,0,0,0.25),0_3px_6px_rgba(0,0,0,0.25)] focus:ring-2 focus:ring-orange-300"
              />
            </div>
          </div>

          {/* תשלום חודשי */}
          <p className="text-center text-white text-xl font-extrabold mt-6 drop-shadow-lg">
            תשלום חודשי: {formattedMonthlyPayment} ₪
          </p>
        </div>

        {/* ===== כפתור חישוב ===== */}
        <button
          disabled={
            !selected ||
            contractPrice === "" ||
            propertyValue === "" ||
            propertyValue < contractPrice
          }
          className={`w-full py-3 rounded-md font-bold mt-6 transition text-blue-900
            ${
              !selected || propertyValue < contractPrice
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-b from-white to-[#e8eef6] shadow-[0_-3px_8px_rgba(255,255,255,0.8),0_6px_12px_rgba(0,0,0,0.25),inset_0_4px_8px_rgba(0,0,0,0.1),inset_0_-4px_8px_rgba(255,255,255,0.7)] hover:brightness-105"
            }`}
        >
          חשב
        </button>

      </div>
    </div>
  </div>
</div>

  
  );
};

export default PriceGrantSimulator;

























