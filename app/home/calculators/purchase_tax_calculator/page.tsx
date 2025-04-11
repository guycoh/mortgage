"use client"
import { useState } from "react";

const PurchaseTaxCalculator = () => {
  const [propertyPrice, setPropertyPrice] = useState<number | "">("");
  const [isSingleHome, setIsSingleHome] = useState<boolean>(true);
  const [purchaseTax, setPurchaseTax] = useState<number | null>(null);

  const formatNumber = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const handlePropertyPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, "");
    const numericValue = Number(rawValue);
    if (!isNaN(numericValue)) {
      setPropertyPrice(numericValue);
    } else {
      setPropertyPrice("");
    }
  };

  const calculateTax = () => {
    if (!propertyPrice || propertyPrice <= 0) {
      setPurchaseTax(null);
      return;
    }

    let tax = 0;

    if (isSingleHome) {
      // מדרגות מס רכישה 2023 לדירה יחידה
      const brackets = [
        { limit: 1944000, rate: 0 },
        { limit: 5175000, rate: 0.035 },
        { limit: 17225000, rate: 0.05 },
        { limit: 23607250, rate: 0.08 },
        { limit: Infinity, rate: 0.1 },
      ];

      let remainingPrice = propertyPrice;

      for (let i = 0; i < brackets.length; i++) {
        const { limit, rate } = brackets[i];
        const prevLimit = i === 0 ? 0 : brackets[i - 1].limit;

        if (remainingPrice > limit - prevLimit) {
          tax += (limit - prevLimit) * rate;
          remainingPrice -= limit - prevLimit;
        } else {
          tax += remainingPrice * rate;
          break;
        }
      }
    } else {
      // מדרגות מס רכישה לדירה נוספת
      const brackets = [
        { limit: 5373000, rate: 0.08 },
        { limit: Infinity, rate: 0.1 },
      ];

      let remainingPrice = propertyPrice;

      for (let i = 0; i < brackets.length; i++) {
        const { limit, rate } = brackets[i];
        const prevLimit = i === 0 ? 0 : brackets[i - 1].limit;

        if (remainingPrice > limit - prevLimit) {
          tax += (limit - prevLimit) * rate;
          remainingPrice -= limit - prevLimit;
        } else {
          tax += remainingPrice * rate;
          break;
        }
      }
    }

    setPurchaseTax(tax);
  };

  return (
    <div className="min-h-screen flex justify-center bg-gray-100">
      <div className="bg-white shadow-md my-6 rounded-lg p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center text-[#1d75a1]">
          מחשבון מס רכישה
        </h1>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            מחיר הדירה (בש"ח):
          </label>
          <input
            type="text"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={propertyPrice !== "" ? formatNumber(propertyPrice.toString()) : ""}
            onChange={handlePropertyPriceChange}
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            האם זו דירה יחידה?
          </label>
          <div className="flex items-center">
            <input
              type="radio"
              id="singleHome"
              name="homeType"
              value="single"
              checked={isSingleHome}
              onChange={() => setIsSingleHome(true)}
              className="mr-2"
            />
            <label htmlFor="singleHome" className="mr-4">
              כן
            </label>
            <input
              type="radio"
              id="additionalHome"
              name="homeType"
              value="additional"
              checked={!isSingleHome}
              onChange={() => setIsSingleHome(false)}
              className="mr-2"
            />
            <label htmlFor="additionalHome">לא</label>
          </div>
        </div>

        <button
          onClick={calculateTax}
          className="bg-[#1d75a1] hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
        >
          חשב מס
        </button>

        {purchaseTax !== null && (
          <div className="mt-4 p-4 bg-gray-100 rounded shadow">
            <h2 className="text-lg font-bold text-gray-700">מס הרכישה המשוער:</h2>
            <p className="text-gray-900 text-xl">
              {purchaseTax.toLocaleString()} ש"ח
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseTaxCalculator;





























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
