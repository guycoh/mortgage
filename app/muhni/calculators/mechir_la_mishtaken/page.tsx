"use client"

import  { useState } from 'react';
import ProfileImage from '../../components/ProfileImage';

type SettlementGrant = {
  name: string;
  grant: number;
};

const settlements: SettlementGrant[] = [
  { name: 'אופקים', grant: 60000 },
  { name: 'בית שאן', grant: 60000 },
  { name: 'דימונה', grant: 60000 },
  { name: 'טבריה', grant: 60000 },
  { name: 'ירוחם', grant: 60000 },
  { name: 'מצפה רמון', grant: 60000 },
  { name: 'נצרת', grant: 60000 },
  { name: 'נוף הגליל (נצרת עילית)', grant: 60000 },
  { name: 'נתיבות', grant: 60000 },
  { name: 'אילת', grant: 40000 },
  { name: 'אשקלון', grant: 40000 },
  { name: 'חריש', grant: 40000 },
  { name: 'נהריה', grant: 40000 },
  { name: 'עכו', grant: 40000 },
  { name: 'עפולה', grant: 40000 },
  { name: 'שלומי', grant: 40000 },
  { name: 'קריית מלאכי', grant: 40000 },
];

const GRANT_CEILING = 1800000;



const PriceGrantSimulator = () => {
  const [contractPrice, setContractPrice] = useState<number | ''>('');
  const [propertyValue, setPropertyValue] = useState<number | ''>('');


  const [hasGrant, setHasGrant] = useState(false);
  const [selected, setSelected] = useState<{ name: string; grant: number } | null>(null);
 

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

    
    const safeContractPrice = typeof contractPrice === 'number' ? contractPrice : 0;
 

    const minEquityCeiling = grantAmount > 0 ? 60000 : 100000;
    const minEquity = Math.max(minEquityCeiling, clientFundingAfterGrant);
    const minimumEquity = Math.max(minEquityCeiling, clientFundingAfterGrant);
   //  const minimumEquity = Math.max(minEquityCeiling, clientFundingAfterGrant);
   
   const maxMortgage = safeContractPrice - minimumEquity;

 
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

  const showWarning =
    contractPrice !== '' &&
    propertyValue !== '' &&
    propertyValue < contractPrice;

  return (
    <div className="relative max-w-md mx-auto mt-10 p-6 bg-white border border-gray-200 rounded-2xl shadow-xl transition-all duration-300 hover:shadow-2xl">
        <div className="absolute left-0 top-0 z-5  flex flex-col items-center ">
              {/* קריאה עם שליטה בגודל ובמיקום */}
          <ProfileImage size={66} position="items-start justify-start" />
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
        <div className="bg-green-50 border border-green-200 p-4 rounded-xl mt-4">
          <h3 className="text-green-700 font-semibold text-sm mb-2 text-right">
            נתוני עזר
          </h3>
          <ul className="space-y-1 text-green-700 text-xs font-medium text-right">
            <li>מינימום הון עצמי: {minimumEquity.toLocaleString()} ₪</li>
            <li>משכנתא מקסימלית: {maxMortgage.toLocaleString()} ₪</li>
          </ul>
        </div>
      )}


  
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





























// "use client"

// import React, { useState } from "react";

// const MortgageForm = () => {
//   const [propertyValue, setPropertyValue] = useState(""); // שווי דירה
//   const [contractAmount, setContractAmount] = useState(""); // סכום חתימת חוזה
//   const [errorMessage, setErrorMessage] = useState(""); // הודעת שגיאה

//   const MAX_PROPERTY_VALUE = 1800000; // תקרת שווי נכס לחישוב

//   פונקציה להסרת מפרידי אלפים
//   const removeSeparators = (value: string) => value.replace(/,/g, "");

//   פונקציה להוספת מפרידי אלפים
//   const formatWithSeparators = (value: string | number) =>
//     Number(value).toLocaleString("he-IL");

//   חישוב תקרת נכס קובעת
//   const calculateDecidingPropertyCap = () => {
//     const numericPropertyValue = Number(removeSeparators(propertyValue)) || 0;
//     const numericContractAmount = Number(removeSeparators(contractAmount)) || 0;

//     if (numericPropertyValue < MAX_PROPERTY_VALUE) {
//       אם שווי הדירה קטן מ-1,800,000
//       return Math.max(
//         numericPropertyValue,
//         numericContractAmount,
//         MAX_PROPERTY_VALUE
//       );
//     } else {
//       אם שווי הדירה גדול או שווה ל-1,800,000
//       return Math.max(MAX_PROPERTY_VALUE, numericContractAmount);
//     }
//   };

//   const decidingPropertyCap = calculateDecidingPropertyCap();

//   עדכון שווי הדירה
//   const handlePropertyValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const rawValue = removeSeparators(e.target.value);
//     if (!isNaN(Number(rawValue))) {
//       setPropertyValue(formatWithSeparators(rawValue));
//       setErrorMessage(""); // מנקה שגיאות במידת הצורך
//     }
//   };

//   עדכון סכום חתימת חוזה
//   const handleContractAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const rawValue = removeSeparators(e.target.value);
//     if (!isNaN(Number(rawValue))) {
//       const numericPropertyValue = Number(removeSeparators(propertyValue));
//       const numericContractAmount = Number(rawValue);

//       if (numericContractAmount > numericPropertyValue) {
//         setErrorMessage(
//           "שגיאה: סכום חתימת החוזה לא יכול להיות גבוה משווי הדירה! השדה אופס."
//         );
//         setContractAmount(""); // איפוס סכום חתימת החוזה
//       } else {
//         setContractAmount(formatWithSeparators(rawValue));
//         setErrorMessage(""); // ניקוי שגיאות
//       }
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
//       <div className="bg-white shadow-md rounded-lg p-6 max-w-lg w-full">
//         <h1 className="text-2xl font-bold text-blue-600 mb-4">
//           טופס משכנתא - שווי דירה וסכום חתימת חוזה
//         </h1>

//         {/* שווי דירה */}
//         <div className="mb-4">
//           <label
//             htmlFor="propertyValue"
//             className="block text-gray-700 font-medium mb-2"
//           >
//             שווי דירה (₪):
//           </label>
//           <input
//             type="text"
//             id="propertyValue"
//             className="w-full border rounded px-3 py-2"
//             placeholder="הזן את שווי הדירה"
//             value={propertyValue}
//             onChange={handlePropertyValueChange}
//           />
//           <p className="text-sm text-gray-500 mt-1">
//             תקרת שווי נכס לחישוב: {formatWithSeparators(MAX_PROPERTY_VALUE)} ₪
//           </p>
//         </div>

//         {/* סכום חתימת חוזה */}
//         <div className="mb-4">
//           <label
//             htmlFor="contractAmount"
//             className="block text-gray-700 font-medium mb-2"
//           >
//             סכום חתימת חוזה (₪):
//           </label>
//           <input
//             type="text"
//             id="contractAmount"
//             className="w-full border rounded px-3 py-2"
//             placeholder="הזן את סכום חתימת החוזה"
//             value={contractAmount}
//             onChange={handleContractAmountChange}
//           />
//         </div>

//         {/* תקרת נכס קובעת */}
//         <div className="mb-4">
//           <label
//             htmlFor="decidingPropertyCap"
//             className="block text-gray-700 font-medium mb-2"
//           >
//             תקרת נכס קובעת (₪):
//           </label>
//           <input
//             type="text"
//             id="decidingPropertyCap"
//             className="w-full border rounded px-3 py-2 bg-gray-100"
//             value={formatWithSeparators(decidingPropertyCap)}
//             readOnly
//           />
//         </div>

//         {/* הודעת שגיאה */}
//         {errorMessage && (
//           <div className="mt-4 text-red-500 font-medium">{errorMessage}</div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default MortgageForm;
