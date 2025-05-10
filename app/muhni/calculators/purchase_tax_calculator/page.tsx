"use client";
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
          { limit: 1944000, rate: 0 },
          { limit: 5175000, rate: 0.035 },
          { limit: 17225000, rate: 0.05 },
          { limit: 23607250, rate: 0.08 },
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
    <div className=" min-h-screen my-6 bg-[#f9fafb] rounded-3xl shadow-2xl w-full max-w-3xl mx-auto p-6 sm:p-8 border border-gray-200">
      <h1 className="text-4xl text-center font-extrabold text-main mb-6">
        מחשבון מס רכישה 🏡
      </h1>

      {/* שדה מחיר */}
      <div className="mb-4">
        <label className="block text-gray-800 font-semibold mb-2">
          מחיר הדירה (₪):
        </label>
        <input
          type="text"
          inputMode="numeric"
          className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none shadow-inner text-lg"
          value={
            propertyPrice !== "" ? formatNumber(propertyPrice.toString()) : ""
          }
          onChange={handlePropertyPriceChange}
        />
      </div>

      {/* בחירת דירה יחידה */}
      <div className="mb-4">
        <label className="block text-gray-800 font-semibold mb-2">
          האם זו דירה יחידה?
        </label>
        <div className="flex gap-6 text-lg">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={isSingleHome}
              onChange={() => setIsSingleHome(true)}
            />
            כן
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={!isSingleHome}
              onChange={() => setIsSingleHome(false)}
            />
            לא
          </label>
        </div>
      </div>

      {/* כפתורים */}
      <div className="flex flex-col sm:flex-row gap-4 mt-4">
        <button
          onClick={calculateTax}
          className="flex-1 py-3 rounded-xl bg-main text-white font-bold hover:bg-blue-800 transition-all shadow-lg text-xl"
        >
          חשב מס 💰
        </button>
        <button
          onClick={resetForm}
          className="flex-1 py-3 rounded-xl bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition-all shadow text-xl"
        >
          נקה טופס ♻️
        </button>
      </div>

      {/* תוצאה */}
      {totalTax !== null && (
        <div className="mt-6 bg-white rounded-xl p-6 shadow-xl border border-blue-200 animate-fade-in">
          <h2 className="text-2xl font-bold text-[#1d75a1] mb-4">
            פירוט מס רכישה:
          </h2>
          <div className="space-y-4">
            {taxBreakdown.map((step, idx) => (
              <div
                key={idx}
                className="bg-blue-50 rounded-xl p-4 shadow-sm border border-blue-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2"
              >
                <div>
                  <span className="font-semibold text-gray-700">מ:</span> ₪
                  {step.from.toLocaleString()}
                </div>
                <div>
                  <span className="font-semibold text-gray-700">עד:</span> ₪
                  {step.to.toLocaleString()}
                </div>
                <div>
                  <span className="font-semibold text-gray-700">שיעור מס:</span>{" "}
                  {(step.rate * 100).toFixed(1)}%
                </div>
                <div className="text-blue-800 font-bold">
                  <span className="font-semibold text-gray-700">תשלום:</span>{" "}
                  ₪{step.amount.toLocaleString()}
                </div>
              </div>
            ))}

            <div className="bg-[#e3f2fd] rounded-xl p-4 text-lg font-bold text-blue-900 text-center shadow-inner border-t-2 border-blue-300">
              סך הכל מס רכישה: ₪{totalTax.toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseTaxForm;
















// "use client";
// import { useState } from "react";

// const PurchaseTaxCalculator = () => {
//   const [propertyPrice, setPropertyPrice] = useState<number | "">("");
//   const [isSingleHome, setIsSingleHome] = useState<boolean>(true);
//   const [taxBreakdown, setTaxBreakdown] = useState<
//     { from: number; to: number; rate: number; amount: number }[]
//   >([]);
//   const [totalTax, setTotalTax] = useState<number | null>(null);

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
//       setTotalTax(null);
//       return;
//     }

//     let tax = 0;
//     const breakdown = [];

//     const brackets = isSingleHome
//       ? [
//           { limit: 1944000, rate: 0 },
//           { limit: 5175000, rate: 0.035 },
//           { limit: 17225000, rate: 0.05 },
//           { limit: 23607250, rate: 0.08 },
//           { limit: Infinity, rate: 0.1 },
//         ]
//       : [
//           { limit: 5373000, rate: 0.08 },
//           { limit: Infinity, rate: 0.1 },
//         ];

//     let remaining = propertyPrice;
//     let prev = 0;

//     for (let i = 0; i < brackets.length; i++) {
//       const { limit, rate } = brackets[i];
//       const range = Math.min(limit - prev, remaining);
//       const amount = range * rate;
//       tax += amount;
//       breakdown.push({ from: prev + 1, to: prev + range, rate, amount });
//       remaining -= range;
//       prev = limit;
//       if (remaining <= 0) break;
//     }

//     setTaxBreakdown(breakdown);
//     setTotalTax(tax);
//   };

//   return (
//     <div className="min-h-screen flex justify-center bg-gradient-to-br from-purple-50 via-violet-100 to-purple-200 py-16 px-6">
//       <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-2xl border border-white/40">
//         <h1 className="text-4xl text-center font-extrabold text-main mb-6">
//           מחשבון מס רכישה 🏡
//         </h1>

//         <div className="mb-4">
//           <label className="block text-gray-800 font-semibold mb-2">מחיר הדירה (₪):</label>
//           <input
//             type="text"
//             inputMode="numeric"
//             className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none shadow-inner text-lg"
//             value={propertyPrice !== "" ? formatNumber(propertyPrice.toString()) : ""}
//             onChange={handlePropertyPriceChange}
//           />
//         </div>

//         <div className="mb-4">
//           <label className="block text-gray-800 font-semibold mb-2">האם זו דירה יחידה?</label>
//           <div className="flex gap-6 text-lg">
//             <label className="flex items-center gap-2">
//               <input
//                 type="radio"
//                 checked={isSingleHome}
//                 onChange={() => setIsSingleHome(true)}
//               />
//               כן
//             </label>
//             <label className="flex items-center gap-2">
//               <input
//                 type="radio"
//                 checked={!isSingleHome}
//                 onChange={() => setIsSingleHome(false)}
//               />
//               לא
//             </label>
//           </div>
//         </div>

//         <button
//           onClick={calculateTax}
//           className="w-full py-3 mt-2 rounded-xl bg-main text-white font-bold hover:bg-blue-800 transition-all shadow-lg text-xl"
//         >
//           חשב מס 💰
//         </button>

//         {totalTax !== null && (
//   <div className="mt-6 bg-white rounded-xl p-6 shadow-xl border border-blue-200 animate-fade-in">
//     <h2 className="text-2xl font-bold text-[#1d75a1] mb-4">פירוט מס רכישה:</h2>
//     <div className="space-y-4">
//       {taxBreakdown.map((step, idx) => (
//         <div
//           key={idx}
//           className="bg-blue-50 rounded-xl p-4 shadow-sm border border-blue-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2"
//         >
//           <div><span className="font-semibold text-gray-700">מ:</span> ₪{step.from.toLocaleString()}</div>
//           <div><span className="font-semibold text-gray-700">עד:</span> ₪{step.to.toLocaleString()}</div>
//           <div><span className="font-semibold text-gray-700">שיעור מס:</span> {(step.rate * 100).toFixed(1)}%</div>
//           <div className="text-blue-800 font-bold"><span className="font-semibold text-gray-700">תשלום:</span> ₪{step.amount.toLocaleString()}</div>
//         </div>
//       ))}

//       <div className="bg-[#e3f2fd] rounded-xl p-4 text-lg font-bold text-blue-900 text-center shadow-inner border-t-2 border-blue-300">
//         סך הכל מס רכישה: ₪{totalTax.toLocaleString()}
//       </div>
//     </div>
//   </div>
// )}

//       </div>
//     </div>
//   );
// };

// export default PurchaseTaxCalculator;











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
