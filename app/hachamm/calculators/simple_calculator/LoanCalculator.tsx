"use client"

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { HmButton } from '../../components/HmButton';
import { HmFigure } from '../../components/HmFigure';

interface MonthlyData {
  month: number;
  principalPaid: number;
  interestPaid: number;
  totalPaid: number;
  remainingBalance: number;
}

export default function LoanCalculator() {
  const [amount, setAmount] = useState<number | ''>('');
  const [interest, setInterest] = useState<number | ''>(5);
  const [months, setMonths] = useState<number | ''>('');

  const amountNum = Number(amount) || 0;
  const interestNum = Number(interest) || 0;
  const monthsNum = Number(months) || 0;

  const monthlyRate = interestNum / 100 / 12;
  const monthlyPayment =
    amountNum && interestNum && monthsNum
      ? (amountNum * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -monthsNum))
      : 0;



  const getMonthlyBreakdown = (): MonthlyData[] => {
    if (!amountNum || !interestNum || !monthsNum) return [];
    let balance = amountNum;
    const breakdown: MonthlyData[] = [];

    for (let m = 1; m <= monthsNum; m++) {
      const interestPart = balance * monthlyRate;
      const principalPart = monthlyPayment - interestPart;

      breakdown.push({
        month: m,
        interestPaid: interestPart,
        principalPaid: principalPart,
        totalPaid: interestPart + principalPart,
        remainingBalance: balance - principalPart,
      });

      balance -= principalPart;
      if (balance < 0) balance = 0;
    }

    return breakdown;
  };

  const breakdown = getMonthlyBreakdown();

  const resetForm = () => {
    setAmount('');
    setInterest('');
    setMonths('');
  };

  return (
<div className="hm-page">
  <div className="relative w-full max-w-[500px]">

    {/* ===== קוביית המחשבון ===== */}
    <div className="hm-device z-10 p-5 sm:p-8">
      <div className="hm-device-gloss" />

      {/* תוכן המחשבון */}
      <div className="relative flex flex-col items-center space-y-5">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center drop-shadow-lg">
          מחשבון הלוואה
        </h2>

        {/* שדות הקלט */}
        <div className="w-full space-y-4">
          {/* סכום ההלוואה */}
          <div>
            <label className="block text-sm mb-1 opacity-90">
              סכום ההלוואה (₪)
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="לדוגמה: 350,000"
              className="hm-field"
              value={amount === "" ? "" : amount.toLocaleString()}
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, "");
                const num = Number(raw);
                if (!isNaN(num)) setAmount(num);
              }}
              onFocus={(e) => {
                if (amount !== "") e.target.value = amount.toString();
              }}
              onBlur={(e) => {
                if (amount !== "") e.target.value = amount.toLocaleString();
              }}
            />
          </div>

     
        {/* ריבית שנתית - מחוון רגיל (נמוך משמאל, גבוה מימין) */}
        <div>
          <label className="block text-sm mb-2 text-slate-100">
            ריבית שנתית (%)
          </label>

          <div className="flex items-center gap-3">
            {/* מחוון משמאל לימין */}
            <input
              type="range"
              min="0"
              max="20"
              step="0.1"
              dir="ltr" // שומר על כיוון שמאל→ימין גם בתוך RTL
              value={interest}
              onChange={(e) => setInterest(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[rgba(255,250,226,0.35)]
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-5
                        [&::-webkit-slider-thumb]:h-5
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-[var(--hm-gold-200)]
                        [&::-webkit-slider-thumb]:border-2
                        [&::-webkit-slider-thumb]:border-[#fffaea]
                        [&::-webkit-slider-thumb]:shadow-md
                        [&::-webkit-slider-runnable-track]:rounded-lg"
            />

            {/* תצוגת אחוז בצד ימין */}
            <span className="w-12 text-center font-bold">
              {Number(interest).toFixed(1)}%
            </span>
          </div>
        </div>

          {/* חודשי הלוואה */}
          <div>
            <label className="block text-sm mb-1 opacity-90">
              מספר חודשי הלוואה
            </label>
            <input
              type="number"
              placeholder="לדוגמה: 240"
              className="hm-field"
              value={months}
              onChange={(e) =>
                setMonths(e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          </div>
        </div>

        {/* כפתורים */}
 

        <HmButton
          onClick={resetForm}
          variant="ghost"
          fullWidth
          icon={<RotateCcw className="h-[18px] w-[18px]" />}
        >
          נקה
        </HmButton>

          {/* <div className="flex w-full justify-between gap-3 mt-4">
          
          <button
            onClick={resetForm}
            className="flex-1 py-3 rounded-md bg-white text-[var(--hm-gold-700)] font-bold shadow-[inset_0_4px_6px_rgba(0,0,0,0.15),0_4px_8px_rgba(0,0,0,0.25)] hover:shadow-[inset_0_2px_3px_rgba(0,0,0,0.1),0_6px_10px_rgba(0,0,0,0.35)] active:translate-y-[1px] transition-all"
          >
            נקה
          </button>
        </div> */}

        {/* תוצאה */}
        <div className="hm-panel mt-3 p-4 text-center">
          <p className="text-[12px] font-semibold tracking-[0.14em] text-[var(--hm-ink-faint)]">
            תשלום חודשי מוערך
          </p>
          <p className="hm-figure mt-1.5 text-3xl">
            <HmFigure value={monthlyPayment} decimals={0} />
          </p>
        </div>

      </div>
      <div className="hm-device-shade" />
    </div>

    {/* ===== בסיס / שולחן ===== */}
    <div className="relative w-full h-[50px] mt-[-10px] z-0">
      <div className="hm-device-base absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[500px] h-[10px] rounded-b-2xl shadow-md"></div>
      {/* w-[85%] ולא רוחב קבוע — 400px גלש מעבר למסך של 390px */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[85%] max-w-[400px] h-[20px] bg-black/20 blur-2xl rounded-full"></div>
    </div>

    {/* ===== טבלת סילוקין ===== */}
    {breakdown.length > 0 && (
      <div className="w-full mt-12 bg-white rounded-xl p-4 shadow-inner text-gray-900 max-h-[500px] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-3">פירוט חודשי</h2>
        <table className="w-full text-sm text-right">
          <thead className="text-xs text-gray-500 uppercase border-b">
            <tr>
              <th className="px-3 py-2">חודש</th>
              <th className="px-3 py-2">תשלום חודשי</th>
              <th className="px-3 py-2 text-rose-500">ריבית</th>
              <th className="px-3 py-2 text-emerald-600">קרן</th>
              <th className="px-3 py-2">יתרה</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((row) => (
              <tr key={row.month} className="border-b hover:bg-sky-50 transition">
                <td className="px-3 py-2">{row.month}</td>
                <td className="px-3 py-2">{row.totalPaid.toFixed(0)}</td>
                <td className="px-3 py-2 text-rose-500">{row.interestPaid.toFixed(0)}</td>
                <td className="px-3 py-2 text-emerald-600">{row.principalPaid.toFixed(0)}</td>
                <td className="px-3 py-2">{row.remainingBalance.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

  </div>
</div>
  );
}













// "use client"

// import { useState } from 'react';

// interface MonthlyData {
//   month: number;
//   principalPaid: number;
//   interestPaid: number;
//   totalPaid: number;
//   remainingBalance: number;
// }

// export default function LoanCalculator() {
//   const [amount, setAmount] = useState<number | ''>('');
//   const [interest, setInterest] = useState<number | ''>('');
//   const [months, setMonths] = useState<number | ''>('');

//   const amountNum = Number(amount) || 0;
//   const interestNum = Number(interest) || 0;
//   const monthsNum = Number(months) || 0;

//   const monthlyRate = interestNum / 100 / 12;
//   const monthlyPayment =
//     amountNum && interestNum && monthsNum
//       ? (amountNum * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -monthsNum))
//       : 0;

//   const getMonthlyBreakdown = (): MonthlyData[] => {
//     if (!amountNum || !interestNum || !monthsNum) return [];
//     let balance = amountNum;
//     const breakdown: MonthlyData[] = [];

//     for (let m = 1; m <= monthsNum; m++) {
//       const interestPart = balance * monthlyRate;
//       const principalPart = monthlyPayment - interestPart;

//       breakdown.push({
//         month: m,
//         interestPaid: interestPart,
//         principalPaid: principalPart,
//         totalPaid: interestPart + principalPart,
//         remainingBalance: balance - principalPart,
//       });

//       balance -= principalPart;
//       if (balance < 0) balance = 0;
//     }

//     return breakdown;
//   };

//   const breakdown = getMonthlyBreakdown();

//   const resetForm = () => {
//     setAmount('');
//     setInterest('');
//     setMonths('');
//   };

//   return (
//  <div className="flex justify-center items-start min-h-screen bg-gradient-to-b from-[var(--hm-paper)] to-[var(--hm-bone-100)] pt-10 pb-20 px-2">
//   <div className="relative w-full max-w-[500px]">

//     {/* ===== קוביית המחשבון ===== */}
//     <div
//       className="relative rounded-2xl overflow-hidden p-6 sm:p-8 z-10"
//       style={{
//         background: "linear-gradient(180deg, var(--hm-gold-700) 0%, var(--hm-gold-800) 100%)",
//         boxShadow:
//           "0 18px 28px rgba(0,0,0,0.3), inset 0 2px 8px rgba(255,255,255,0.15)",
//       }}
//     >
//       {/* פס עליון מבריק */}
//       <div className="absolute top-0 left-0 w-full h-[10px] bg-white/20"></div>

//       {/* תוכן המחשבון */}
//       <div className="flex flex-col items-center space-y-5 text-white">
//         <h2 className="text-2xl sm:text-3xl font-extrabold text-center drop-shadow-lg">
//           מחשבון הלוואה
//         </h2>

//         {/* שדות הקלט */}
//         <div className="w-full space-y-4">
//           {/* סכום ההלוואה */}
//           <div>
//             <label className="block text-sm mb-1 opacity-90">
//               סכום ההלוואה (₪)
//             </label>
//             <input
//               type="text"
//               inputMode="numeric"
//               placeholder="לדוגמה: 350,000"
//               className="hm-field"
//               value={amount === "" ? "" : amount.toLocaleString()}
//               onChange={(e) => {
//                 const raw = e.target.value.replace(/,/g, "");
//                 const num = Number(raw);
//                 if (!isNaN(num)) setAmount(num);
//               }}
//               onFocus={(e) => {
//                 if (amount !== "") e.target.value = amount.toString();
//               }}
//               onBlur={(e) => {
//                 if (amount !== "") e.target.value = amount.toLocaleString();
//               }}
//             />
//           </div>

//           {/* ריבית שנתית */}
//           <div>
//             <label className="block text-sm mb-1 opacity-90">
//               ריבית שנתית (%)
//             </label>
//             <input
//               type="text"
//               inputMode="decimal"
//               placeholder="לדוגמה: 4.8"
//               className="hm-field"
//               value={interest === "" ? "" : interest.toString()}
//               onChange={(e) => {
//                 const raw = e.target.value.replace(",", ".");
//                 if (/^\d*\.?\d*$/.test(raw) || raw === "") {
//                   setInterest(raw === "" ? "" : Number(raw));
//                 }
//               }}
//             />
//           </div>

//           {/* חודשי הלוואה */}
//           <div>
//             <label className="block text-sm mb-1 opacity-90">
//               מספר חודשי הלוואה
//             </label>
//             <input
//               type="number"
//               placeholder="לדוגמה: 240"
//               className="hm-field"
//               value={months}
//               onChange={(e) =>
//                 setMonths(e.target.value === "" ? "" : Number(e.target.value))
//               }
//             />
//           </div>
//         </div>

//         {/* כפתורים */}
//         <div className="flex w-full justify-between gap-3 mt-4">
//           <button
//             onClick={() => {}}
//             className="flex-1 py-3 rounded-md bg-white text-[var(--hm-gold-700)] font-bold shadow-[inset_0_4px_6px_rgba(0,0,0,0.15),0_4px_8px_rgba(0,0,0,0.25)] hover:shadow-[inset_0_2px_3px_rgba(0,0,0,0.1),0_6px_10px_rgba(0,0,0,0.35)] active:translate-y-[1px] transition-all"
//           >
//             חשב
//           </button>
//           <button
//             onClick={resetForm}
//             className="flex-1 py-3 rounded-md bg-white text-[var(--hm-gold-700)] font-bold shadow-[inset_0_4px_6px_rgba(0,0,0,0.15),0_4px_8px_rgba(0,0,0,0.25)] hover:shadow-[inset_0_2px_3px_rgba(0,0,0,0.1),0_6px_10px_rgba(0,0,0,0.35)] active:translate-y-[1px] transition-all"
//           >
//             נקה
//           </button>
//         </div>

//         {/* תוצאה */}
//         <div className="w-full bg-white rounded-xl p-4 mt-3 shadow-inner text-gray-900 text-center">
//           <p className="text-lg font-medium">תשלום חודשי מוערך:</p>
//           <p className="text-3xl font-bold text-[var(--hm-gold-700)] mt-1">
//             ₪{monthlyPayment.toFixed(2)}
//           </p>
//         </div>



//       </div>
  
 

//     </div>

//  {/* ===== בסיס/שולחן מתחת לקובייה ===== */}
//     <div className="relative w-full h-[50px] mt-[-10px] z-0">
//       {/* בסיס/שולחן */}
//       <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[500px] h-[10px] bg-gradient-to-b from-[#cfc3a0] to-[#8a7c58] rounded-b-2xl shadow-md"></div>
//       {/* צל רך מתחת */}
//       <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[400px] h-[20px] bg-black/20 blur-2xl rounded-full"></div>
//     </div>

//     {/* ===== טבלת סילוקין (מתחת לכל האלמנטים) ===== */}
//     {breakdown.length > 0 && (
//       <div className="w-full mt-12 bg-white rounded-xl p-4 shadow-inner text-gray-900 max-h-[500px] overflow-y-auto">
//         <h2 className="text-xl font-bold text-gray-800 mb-3">פירוט חודשי</h2>
//         <table className="w-full text-sm text-right">
//           <thead className="text-xs text-gray-500 uppercase border-b">
//             <tr>
//               <th className="px-3 py-2">חודש</th>
//               <th className="px-3 py-2">תשלום חודשי</th>
//               <th className="px-3 py-2 text-rose-500">ריבית</th>
//               <th className="px-3 py-2 text-emerald-600">קרן</th>
//               <th className="px-3 py-2">יתרה</th>
//             </tr>
//           </thead>
//           <tbody>
//             {breakdown.map((row) => (
//               <tr key={row.month} className="border-b hover:bg-sky-50 transition">
//                 <td className="px-3 py-2">{row.month}</td>
//                 <td className="px-3 py-2">{row.totalPaid.toFixed(0)}</td>
//                 <td className="px-3 py-2 text-rose-500">{row.interestPaid.toFixed(0)}</td>
//                 <td className="px-3 py-2 text-emerald-600">{row.principalPaid.toFixed(0)}</td>
//                 <td className="px-3 py-2">{row.remainingBalance.toFixed(0)}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     )}

//   </div>
// </div>

//   );
// }
