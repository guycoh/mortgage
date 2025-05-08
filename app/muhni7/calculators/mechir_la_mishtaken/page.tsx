"use client"

import  { useState } from 'react';
import ProfileImage from '../../components/ProfileImage';

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
    <div className="relative max-w-md mx-auto mt-10 p-6 bg-white border border-gray-200 rounded-2xl shadow-xl transition-all duration-300 hover:shadow-2xl">
        <div className="absolute left-0 top-0 z-5  flex flex-col items-center ">
              {/* קריאה עם שליטה בגודל ובמיקום */}
         
        </div>
   
   
   
   
    <h2 className="text-2xl font-bold text-center text-main mb-6">
      סימולטור דירה בהנחה
      <br />
      <span className="text-sm font-medium text-gray-500">מחיר למשתכן</span>
    </h2>
  
    <div className="flex flex-col gap-5 text-right">
  
      {/* מחיר חוזה ושווי נכס בשורה אחת */}
<div className="grid grid-cols-2 gap-4 mb-6">
  {/* מחיר חוזה */}
  <div>
    <label className="block mb-1 text-sm font-medium text-gray-700">מחיר חוזה</label>
    <input
      type="text"
      inputMode="numeric"
      value={formatNumber(contractPrice)}
      onChange={(e) => setContractPrice(parseInput(e.target.value))}
      placeholder="₪ 0"
      className="w-full p-3 border rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
    />
  </div>

        {/* שווי נכס */}
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">שווי נכס (לפי שמאות)</label>
          <input
            type="text"
            inputMode="numeric"
            value={formatNumber(propertyValue)}
            onChange={(e) => setPropertyValue(parseInput(e.target.value))}
            placeholder="₪ 0"
            className="w-full p-3 border rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
          />
          {showWarning && (
            <div className="text-red-600 text-xs font-medium mt-1 animate-pulse">
              שווי נכס חייב להיות גבוה או שווה למחיר חוזה
            </div>
          )}
        </div>
      </div>

  
      {/* צ'קבוקס מענק */}
      <div>
        <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={hasGrant}
            onChange={(e) => {
              setHasGrant(e.target.checked);
              if (!e.target.checked) setSelected(null);
            }}
            className="rounded border-gray-300 text-green-600 focus:ring-2 focus:ring-orange-400"
          />
          האם קיים מענק מקום?
        </label>
      </div>
  
      {/* אם יש מענק */}
      {hasGrant && (
        <div className="grid grid-cols-2 gap-3 items-end bg-orange-50 p-3 rounded-xl border">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">בחר יישוב</label>
            <select
              onChange={handleSelect}
              defaultValue=""
              className="w-full p-3 border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
            >
              <option value="" disabled>-- נא לבחור יישוב --</option>
              {settlements.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">סכום המענק</label>
            <input
              type="text"
              readOnly
              value={grantAmount ? `${grantAmount.toLocaleString()} ₪` : ''}
              placeholder="בחר יישוב"
              className="w-full p-3 bg-gray-100 border rounded-xl text-right"
            />
          </div>
        </div>
      )}

        {/* נתוני עזר - מציג רק מינימום הון עצמי ומשכנתא מקסימלית */}
        {numericContractPrice !== 0 && numericPropertyValue !== 0 && (
          <div>
            <div className="bg-green-50 border border-green-200 p-4 rounded-xl mt-4">
              <h3 className="text-green-700 font-semibold text-sm mb-2 text-right">
                נתוני עזר
              </h3>
              <ul className="space-y-1 text-green-700 text-xs font-medium text-right">
                <li>מינימום הון עצמי: {minimumEquity.toLocaleString()} ₪</li>
                <li>משכנתא מקסימלית: {maxMortgage.toLocaleString()} ₪</li>
              </ul>
            </div>

            {/* מעבר ליכולת החזר */}
            <div className="mt-8 text-right">
              <p className="text-2xl font-bold text-orange-500 mb-6 animate-pulse">
                ועכשיו נעבור ליכולת החזר 🔥
              </p>

              {/* שדה הכנסה חודשית */}
              <div className="mb-4">
                <label className="block mb-1 text-sm font-medium text-gray-700">הכנסה חודשית</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumber(monthlyIncome)}
                  onChange={(e) => setMonthlyIncome(parseInput(e.target.value))}
                  placeholder="₪ 0"
                  className="w-full p-3 border rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {/* שדה הון עצמי */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">הון עצמי</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatNumber(ownEquity)}
                    onChange={(e) => setOwnEquity(parseInput(e.target.value))}
                    placeholder="₪ 0"
                    className={`w-full p-3 border rounded-xl text-right focus:outline-none focus:ring-2 transition ${
                      ownEquity !== '' && ownEquity < minimumEquity ? 'border-red-500 focus:ring-red-400' : 'focus:ring-orange-400'
                    }`}
                  />
                  {/* הודעת שגיאה אם הון עצמי קטן מהמינימום */}
                  {ownEquity !== '' && ownEquity < minimumEquity && (
                    <div className="text-red-600 text-xs font-medium mt-1 animate-pulse text-right">
                      הון עצמי חייב להיות גדול או שווה ל־{minimumEquity.toLocaleString()} ₪
                    </div>
                  )}
                </div>

                {/* שדה משכנתא מבוקשת */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">משכנתא מבוקשת</label>
                  <input
                    type="text"
                    readOnly
                    value={contractPrice && ownEquity !== '' ? formatNumber(contractPrice - ownEquity) : ''}
                    placeholder="₪ 0"
                    className="w-full p-3 border rounded-xl text-right bg-gray-100 text-gray-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* שדות ריבית לתחשיב וחודשי הלוואה בשורה אחת */}
              <div className="grid grid-cols-2 gap-4">
                {/* ריבית לתחשיב */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">ריבית לתחשיב (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={interestRate}
                    onChange={(e) => setInterestRate(parseFloat(e.target.value))}
                    placeholder="5.00"
                    className="w-full p-3 border rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                  />
                </div>

                {/* חודשי הלוואה */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">מספר חודשי הלוואה</label>
                  <input
                    type="number"
                    value={loanMonths}
                    onChange={(e) => setLoanMonths(Number(e.target.value))}
                    placeholder="360"
                    className="w-full p-3 border rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-orange-400 transition"                
                  />




                  
                </div>
              </div>
            </div>
          </div>
        )}
 
 <p>תשלום חודשי: {formattedMonthlyPayment} ₪</p>

  
      {/* נתוני עזר
      {numericContractPrice !== 0 && numericPropertyValue !== 0 && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
          <h3 className="text-green-700 font-semibold text-sm mb-2 text-right">נתוני עזר</h3>
          <ul className="space-y-1 text-green-700 text-xs font-medium text-right">
            <li>תקרת שווי זכאות: {GRANT_CEILING.toLocaleString()} ₪</li>
            <li>מחיר לתחשיב: {priceForCalculation.toLocaleString()} ₪</li>
            <li>75% בנק: {(priceForCalculation * 0.75).toLocaleString()} ₪</li>
            <li>מימון לקוח לפני מענק: {clientFundingBeforeGrant.toLocaleString()} ₪</li>
            <li>סכום המענק: {grantAmount.toLocaleString()} ₪</li>
            <li>תקרת מינימום להון עצמי: {minimumEquityThreshold.toLocaleString()} ₪</li>
            <li>מימון לקוח בניכוי מענק: {clientFundingAfterGrant.toLocaleString()} ₪</li>
            <li>מינימום הון עצמי: {minimumEquity.toLocaleString()} ₪</li>
            <li>משכנתא מקסימלית: {maxMortgage.toLocaleString()} ₪</li>
          </ul>
        </div>
      )} */}
  
      {/* כפתור חישוב */}
      <button
        disabled={
          !selected ||
          contractPrice === '' ||
          propertyValue === '' ||
          propertyValue < contractPrice
        }
        className={`w-full p-3 rounded-xl font-bold text-white transition
          ${
            !selected || propertyValue < contractPrice
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600'
          }`}
      >
        חשב
      </button>
    </div>
  </div>
  
  );
};

export default PriceGrantSimulator;

























