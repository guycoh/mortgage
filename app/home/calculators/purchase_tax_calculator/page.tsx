"use client"
import { useState } from "react";

const PurchaseTaxForm = () => {
  const [propertyPrice, setPropertyPrice] = useState<number | "">("");
  const [isSingleHome, setIsSingleHome] = useState<boolean>(true);
  const [taxBreakdown, setTaxBreakdown] = useState<
    { from: number; to: number; rate: number; amount: number }[]
  >([]);
  const [totalTax, setTotalTax] = useState<number | null>(null);

  const formatNumber = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const handlePropertyPriceChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const rawValue = e.target.value.replace(/,/g, "");
    const numericValue = Number(rawValue);
    if (!isNaN(numericValue)) {
      setPropertyPrice(numericValue);
    } else {
      setPropertyPrice("");
    }
  };

  const resetForm = () => {
    setPropertyPrice("");
    setIsSingleHome(true);
    setTaxBreakdown([]);
    setTotalTax(null);
  };

  const calculateTax = () => {
    if (!propertyPrice || propertyPrice <= 0) {
      setTotalTax(null);
      return;
    }
 
    let tax = 0;
    const breakdown = [];
 
    const brackets = isSingleHome
      ? [
          { limit: 1978745, rate: 0 },
          { limit: 2347040, rate: 0.035 },
          { limit: 6055070, rate: 0.05 },
          { limit: 20183565, rate: 0.08 },
          { limit: Infinity, rate: 0.1 },
        ]
      : [
          { limit: 5373000, rate: 0.08 },
          { limit: Infinity, rate: 0.1 },
        ];

    let remaining = propertyPrice;
    let prev = 0;

    for (let i = 0; i < brackets.length; i++) {
      const { limit, rate } = brackets[i];
      const range = Math.min(limit - prev, remaining);
      const amount = range * rate;
      tax += amount;
      breakdown.push({ from: prev + 1, to: prev + range, rate, amount });
      remaining -= range;
      prev = limit;
      if (remaining <= 0) break;
    }

    setTaxBreakdown(breakdown);
    setTotalTax(tax);
  };

  return (
 <div className="flex justify-center items-start min-h-screen bg-gradient-to-b from-[#f8fafc] to-[#e6eff3] pt-6 pb-6 px-2">
  <div className="relative w-full max-w-[450px]">
    {/* גוף התיבה - רקע טורקיז עם תלת מימד */}
    <div
      className="relative rounded-xl overflow-hidden p-5 sm:p-6"
      style={{
        background: "linear-gradient(180deg, #1d75a1 0%, #15516f 100%)",
        boxShadow:
          "0 20px 30px rgba(0,0,0,0.3), inset 0 2px 8px rgba(255,255,255,0.15)",
      }}
    >
      {/* פס עליון מואר */}
      <div className="absolute top-0 left-0 w-full h-[10px] bg-white/20"></div>

      {/* תוכן המחשבון */}
      <div className="flex flex-col items-center justify-start h-full space-y-4 text-white">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-wide text-center drop-shadow-lg mb-2">
          מחשבון מס רכישה
        </h2>

        {/* שדה מחיר */}
        <input
          type="text"
          inputMode="numeric"
          placeholder="מחיר הדירה (₪)"
          className="w-full rounded-md p-3 text-gray-900 text-base bg-white shadow-inner focus:bg-orange-100 focus:ring-2 focus:ring-orange-300 focus:outline-none transition"
          value={
            propertyPrice !== "" ? formatNumber(propertyPrice.toString()) : ""
          }
          onChange={handlePropertyPriceChange}
        />

        {/* דירה יחידה */}
        <div className="w-full flex justify-start gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={isSingleHome}
              onChange={() => setIsSingleHome(true)}
              className="accent-blue-600"
            />
            כן
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={!isSingleHome}
              onChange={() => setIsSingleHome(false)}
              className="accent-blue-600"
            />
            לא
          </label>
        </div>

        {/* כפתורים עם תלת מימד מתקדם */}
        <div className="flex w-full justify-between gap-3">
          <button
            onClick={calculateTax}
            className="flex-1 py-3 rounded-md bg-white text-blue-900 font-bold shadow-[inset_0_4px_6px_rgba(0,0,0,0.2),0_4px_6px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_2px_3px_rgba(0,0,0,0.1),0_6px_10px_rgba(0,0,0,0.35)] transition-all"
          >
            חשב מס
          </button>
          <button
            onClick={resetForm}
            className="flex-1 py-3 rounded-md bg-white text-blue-900 font-bold shadow-[inset_0_4px_6px_rgba(0,0,0,0.2),0_4px_6px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_2px_3px_rgba(0,0,0,0.1),0_6px_10px_rgba(0,0,0,0.35)] transition-all"
          >
            נקה טופס
          </button>
        </div>

        {/* תוצאה */}
        {totalTax !== null && (
          <div className="w-full bg-white rounded-xl p-4 mt-3 shadow-inner">
            {taxBreakdown.map((step, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row justify-between items-center mb-3 p-3 bg-gray-100 rounded-md shadow-sm text-gray-800"
              >
                <span className="text-sm font-medium">
                  מ: ₪{step.from.toLocaleString()}
                </span>
                <span className="text-sm font-medium">
                  עד: ₪{step.to.toLocaleString()}
                </span>
                <span className="text-sm font-medium">
                  שיעור מס: {(step.rate * 100).toFixed(1)}%
                </span>
                <span className="text-sm font-bold text-gray-900">
                  תשלום: ₪{step.amount.toLocaleString()}
                </span>
              </div>
            ))}
            <div className="mt-3 font-bold text-center text-gray-900 text-base">
              סך הכל מס רכישה: ₪{totalTax.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* פס תחתון עם הצללה */}
      <div className="absolute bottom-0 left-0 w-full h-[14px] bg-black/20 blur-[2px]"></div>
    </div>

    {/* בסיס / שולחן */}
    <div className="absolute bottom-[-18px] left-1/2 -translate-x-1/2 w-full max-w-[450px] h-[10px] bg-gradient-to-b from-[#a9b7bf] to-[#6c7b84] rounded-b-xl shadow-md"></div>

    {/* צל רך מתחת */}
    <div className="absolute bottom-[-30px] left-1/2 -translate-x-1/2 w-[380px] h-[20px] bg-black/20 blur-2xl rounded-full"></div>
  </div>
</div>




  );
};

export default PurchaseTaxForm;















// "use client"
// import { useState } from "react";

// const PurchaseTaxCalculator = () => {
//   const [propertyPrice, setPropertyPrice] = useState<number | "">("");
//   const [isSingleHome, setIsSingleHome] = useState<boolean>(true);
//   const [purchaseTax, setPurchaseTax] = useState<number | null>(null);

//   const formatNumber = (value: string) => {
//     const numericValue = value.replace(/\D/g, "");
//     return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
//   };

//   const handlePropertyPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const rawValue = e.target.value.replace(/,/g, "");
//     const numericValue = Number(rawValue);
//     if (!isNaN(numericValue)) {
//       setPropertyPrice(numericValue);
//     } else {
//       setPropertyPrice("");
//     }
//   };

//   const calculateTax = () => {
//     if (!propertyPrice || propertyPrice <= 0) {
//       setPurchaseTax(null);
//       return;
//     }

//     let tax = 0;

//     if (isSingleHome) {
//       // מדרגות מס רכישה 2023 לדירה יחידה
//       const brackets = [
//         { limit: 1944000, rate: 0 },
//         { limit: 5175000, rate: 0.035 },
//         { limit: 17225000, rate: 0.05 },
//         { limit: 23607250, rate: 0.08 },
//         { limit: Infinity, rate: 0.1 },
//       ];

//       let remainingPrice = propertyPrice;

//       for (let i = 0; i < brackets.length; i++) {
//         const { limit, rate } = brackets[i];
//         const prevLimit = i === 0 ? 0 : brackets[i - 1].limit;

//         if (remainingPrice > limit - prevLimit) {
//           tax += (limit - prevLimit) * rate;
//           remainingPrice -= limit - prevLimit;
//         } else {
//           tax += remainingPrice * rate;
//           break;
//         }
//       }
//     } else {
//       // מדרגות מס רכישה לדירה נוספת
//       const brackets = [
//         { limit: 5373000, rate: 0.08 },
//         { limit: Infinity, rate: 0.1 },
//       ];

//       let remainingPrice = propertyPrice;

//       for (let i = 0; i < brackets.length; i++) {
//         const { limit, rate } = brackets[i];
//         const prevLimit = i === 0 ? 0 : brackets[i - 1].limit;

//         if (remainingPrice > limit - prevLimit) {
//           tax += (limit - prevLimit) * rate;
//           remainingPrice -= limit - prevLimit;
//         } else {
//           tax += remainingPrice * rate;
//           break;
//         }
//       }
//     }

//     setPurchaseTax(tax);
//   };

//   return (
//     <div className="min-h-screen flex justify-center bg-gray-100">
//       <div className="bg-white shadow-md my-6 rounded-lg p-6 w-full max-w-md">
//         <h1 className="text-2xl font-bold mb-4 text-center text-[#1d75a1]">
//           מחשבון מס רכישה
//         </h1>

//         <div className="mb-4">
//           <label className="block text-gray-700 text-sm font-bold mb-2">
//             מחיר הדירה (בש"ח):
//           </label>
//           <input
//             type="text"
//             className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
//             value={propertyPrice !== "" ? formatNumber(propertyPrice.toString()) : ""}
//             onChange={handlePropertyPriceChange}
//           />
//         </div>

//         <div className="mb-4">
//           <label className="block text-gray-700 text-sm font-bold mb-2">
//             האם זו דירה יחידה?
//           </label>
//           <div className="flex items-center">
//             <input
//               type="radio"
//               id="singleHome"
//               name="homeType"
//               value="single"
//               checked={isSingleHome}
//               onChange={() => setIsSingleHome(true)}
//               className="mr-2"
//             />
//             <label htmlFor="singleHome" className="mr-4">
//               כן
//             </label>
//             <input
//               type="radio"
//               id="additionalHome"
//               name="homeType"
//               value="additional"
//               checked={!isSingleHome}
//               onChange={() => setIsSingleHome(false)}
//               className="mr-2"
//             />
//             <label htmlFor="additionalHome">לא</label>
//           </div>
//         </div>

//         <button
//           onClick={calculateTax}
//           className="bg-[#1d75a1] hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
//         >
//           חשב מס
//         </button>

//         {purchaseTax !== null && (
//           <div className="mt-4 p-4 bg-gray-100 rounded shadow">
//             <h2 className="text-lg font-bold text-gray-700">מס הרכישה המשוער:</h2>
//             <p className="text-gray-900 text-xl">
//               {purchaseTax.toLocaleString()} ש"ח
//             </p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default PurchaseTaxCalculator;





























// pages/purchase-tax-calculator.tsx
// import { useState } from "react";

// const PurchaseTaxCalculator = () => {
//   const [propertyPrice, setPropertyPrice] = useState<number | "">("");
//   const [isSingleHome, setIsSingleHome] = useState<boolean>(true);
//   const [purchaseTax, setPurchaseTax] = useState<number | null>(null);

//   const calculateTax = () => {
//     if (!propertyPrice || propertyPrice <= 0) {
//       setPurchaseTax(null);
//       return;
//     }

//     let tax = 0;

//     if (isSingleHome) {
//       // מדרגות מס רכישה 2023 לדירה יחידה
//       const brackets = [
//         { limit: 1944000, rate: 0 },
//         { limit: 5175000, rate: 0.035 },
//         { limit: 17225000, rate: 0.05 },
//         { limit: 23607250, rate: 0.08 },
//         { limit: Infinity, rate: 0.1 },
//       ];

//       let remainingPrice = propertyPrice;

//       for (let i = 0; i < brackets.length; i++) {
//         const { limit, rate } = brackets[i];
//         const prevLimit = i === 0 ? 0 : brackets[i - 1].limit;

//         if (remainingPrice > limit - prevLimit) {
//           tax += (limit - prevLimit) * rate;
//           remainingPrice -= limit - prevLimit;
//         } else {
//           tax += remainingPrice * rate;
//           break;
//         }
//       }
//     } else {
//       // מדרגות מס רכישה לדירה נוספת (לדוגמה, יש להתעדכן לפי נתוני רשות המסים)
//       const brackets = [
//         { limit: 5373000, rate: 0.08 },
//         { limit: Infinity, rate: 0.1 },
//       ];

//       let remainingPrice = propertyPrice;

//       for (let i = 0; i < brackets.length; i++) {
//         const { limit, rate } = brackets[i];
//         const prevLimit = i === 0 ? 0 : brackets[i - 1].limit;

//         if (remainingPrice > limit - prevLimit) {
//           tax += (limit - prevLimit) * rate;
//           remainingPrice -= limit - prevLimit;
//         } else {
//           tax += remainingPrice * rate;
//           break;
//         }
//       }
//     }

//     setPurchaseTax(tax);
//   };

//   return (
//     <div className="min-h-screen flex justify-center bg-gray-100">
//       <div className="bg-white shadow-md my-6 rounded-lg p-6 w-full max-w-md">
//         <h1 className="text-2xl font-bold mb-4 text-center text-[#1d75a1]">
//           מחשבון מס רכישה
//         </h1>


//         <div className="mb-4">
//           <label className="block text-gray-700 text-sm font-bold mb-2">
//             מחיר הדירה (בש"ח):
//           </label>
//           <input
//             type="number"
//             className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
//             value={propertyPrice}
//             onChange={(e) => setPropertyPrice(Number(e.target.value))}
//           />
//         </div>

//         <div className="mb-4">
//           <label className="block text-gray-700 text-sm font-bold mb-2">
//             האם זו דירה יחידה?
//           </label>
//           <div className="flex items-center">
//             <input
//               type="radio"
//               id="singleHome"
//               name="homeType"
//               value="single"
//               checked={isSingleHome}
//               onChange={() => setIsSingleHome(true)}
//               className="mr-2"
//             />
//             <label htmlFor="singleHome" className="mr-4">
//               כן
//             </label>
//             <input
//               type="radio"
//               id="additionalHome"
//               name="homeType"
//               value="additional"
//               checked={!isSingleHome}
//               onChange={() => setIsSingleHome(false)}
//               className="mr-2"
//             />
//             <label htmlFor="additionalHome">
//               לא
//             </label>
//           </div>
//         </div>

//         <button
//           onClick={calculateTax}
//           className="bg-[#1d75a1] hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
//         >
//           חשב מס
//         </button>

//         {purchaseTax !== null && (
//           <div className="mt-4 p-4 bg-gray-100 rounded shadow">
//             <h2 className="text-lg font-bold text-gray-700">
//               מס הרכישה המשוער:
//             </h2>
//             <p className="text-gray-900 text-xl">
//               {purchaseTax.toLocaleString()} ש"ח
//             </p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default PurchaseTaxCalculator;
