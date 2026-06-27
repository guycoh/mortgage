"use client";

import { useState } from "react";
import CustomButton from "../../components/CustomButton";

import ReverseMortgageLoanComparison from "./ReverseMortgageLoanComparison";

type Result = {
  loan: number;
  percent: number;
  decidingAge: number;
} | null;

export default function ReverseMortgageCalculator() {

  const [propertyValue, setPropertyValue] = useState("");
  const [age1, setAge1] = useState("");
  const [age2, setAge2] = useState("");

  // הגדרת ערכי ברירת מחדל
  const [months, setMonths] = useState("360");
  const [interestRate, setInterestRate] = useState("4.5");
  const [indexRate, setIndexRate] = useState("2");
  const [result, setResult] = useState<Result>(null);

  const formatNumber = (value:string) => {
    if(!value) return "";
    return Number(
      value.replace(/,/g,"")
    ).toLocaleString("he-IL");
  };

  const calculate = () => {
    const value = Number(propertyValue);
    const borrower1 = Number(age1);
    const borrower2 = Number(age2);

    if (!value || !borrower1) return;

    if (borrower1 < 55) {
      alert("גיל לווה חייב להיות מעל 55");
      return;
    }

    if(age2 && borrower2 < 55){
      alert("גיל לווה 2 חייב להיות מעל 55");
      return;
    }

    const decidingAge =
      age2
      ? Math.min(borrower1, borrower2)
      : borrower1;

    const percent =
      15 + Math.max(0, decidingAge - 55);

    const loan =
      value * (percent / 100);

    setResult({
      decidingAge,
      percent,
      loan
    });
  };

  // פונקציית איפוס שמחזירה לערכי ברירת המחדל המבוקשים
  const handleClear = () => {
    setPropertyValue("");
    setAge1("");
    setAge2("");
    setMonths("360");
    setInterestRate("4.5");
    setIndexRate("2");
    setResult(null);
  };

  return (
    <div className="flex justify-center items-start font-open-sans min-h-screen bg-linear-to-b from-[#f8fafc] to-[#e6eff3] pt-6 pb-6 mt-40 px-2">
      <div className="relative w-full max-w-xl md:max-w-5xl">

        {/* גוף מחשבון */}
        <div
          className="relative rounded-xl overflow-hidden p-5 sm:p-6"
          style={{
            background: "linear-gradient(180deg,#1d75a1 0%,#15516f 100%)",
            boxShadow: "0 20px 30px rgba(0,0,0,0.3), inset 0 2px 8px rgba(255,255,255,0.15)"
          }}
        >
          <div className="absolute top-0 left-0 w-full h-2.5 bg-white/20"/>

          <div className="flex flex-col items-center space-y-4 text-white">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-wide drop-shadow-lg text-center">
              משכנתא הפוכה
            </h2>

            <div className="w-full grid grid-cols-1 md:grid-cols-7 gap-3 items-end">
              
              {/* שווי נכס */}
              <div className="flex flex-col gap-1">
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-sm font-semibold">שווי נכס</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="₪ שווי נכס"
                    className="w-full rounded-md p-3 text-gray-900 bg-white shadow-inner focus:bg-orange-100 focus:ring-2 focus:ring-orange-300 outline-none"
                    value={propertyValue ? formatNumber(propertyValue) : ""}
                    onChange={e => setPropertyValue(e.target.value.replace(/,/g,""))}
                  />
                </div>
              </div>

              {/* גיל לווה 1 */}
              <div className="flex flex-col gap-1 md:col-span-1">
                <label className="text-sm font-semibold">גיל לווה 1</label>
                <input
                  type="number"
                  maxLength={3}
                  placeholder="גיל"
                  className="w-full rounded-md p-3 text-gray-900 bg-white shadow-inner focus:bg-orange-100 focus:ring-2 focus:ring-orange-300 outline-none"
                  value={age1}
                  onChange={e => setAge1(e.target.value.slice(0,3))}
                />
              </div>

              {/* גיל לווה 2 */}
              <div className="flex flex-col gap-1 md:col-span-1">
                <label className="text-sm font-semibold">
                  גיל לווה 2 <span className="text-xs opacity-80">(רשות)</span>
                </label>
                <input
                  type="number"
                  maxLength={3}
                  placeholder="גיל"
                  className="w-full rounded-md p-3 text-gray-900 bg-white shadow-inner focus:bg-orange-100 focus:ring-2 focus:ring-orange-300 outline-none"
                  value={age2}
                  onChange={e => setAge2(e.target.value.slice(0,3))}
                />
              </div>

              {/* גיל קובע */}
              <div className="flex flex-col gap-1 md:col-span-1 md:max-w-20">
                <label className="text-sm font-semibold text-white/90">גיל קובע</label>
                <div className="h-11.5 rounded-md px-3 flex items-center justify-center bg-white/20 backdrop-blur-sm border border-white/30 shadow-inner font-bold">
                  {age1 ? (age2 ? Math.min(Number(age1), Number(age2)) : age1) : "-"}
                </div>
              </div>

              {/* תקופה */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold">תקופה (חודשים)</label>
                <input
                  type="number"
                  placeholder="360"
                  className="w-full rounded-md p-3 text-gray-900 bg-white shadow-inner focus:bg-orange-100 focus:ring-2 focus:ring-orange-300 outline-none"
                  value={months}
                  onChange={e => setMonths(e.target.value)}
                />
              </div>

              {/* ריבית שנתית */}
              <div className="flex flex-col gap-1 md:col-span-1">
                <label className="text-sm font-semibold">ריבית שנתית %</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  className="w-full rounded-md p-3 text-gray-900 bg-white shadow-inner focus:bg-orange-100 focus:ring-2 focus:ring-orange-300 outline-none"
                  value={interestRate}
                  onChange={e => setInterestRate(e.target.value)}
                />
              </div>

              {/* מדד */}
              <div className="flex flex-col gap-1 md:col-span-1">
                <label className="text-sm font-semibold">מדד שנתי משוער %</label>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full rounded-md p-3 text-gray-900 bg-white shadow-inner focus:bg-orange-100 focus:ring-2 focus:ring-orange-300 outline-none"
                  value={indexRate}
                  onChange={e => setIndexRate(e.target.value)}
                />
              </div>

            </div>

            {/* כפתורי מחשבון */}
            <div className="flex flex-wrap justify-center items-center gap-3">
              <CustomButton text="חשב" size="md" onClick={calculate} />
              <CustomButton text="נקה טופס" size="md" onClick={handleClear} />
            </div>

            {result && (
              <div className="w-full bg-white rounded-xl p-4 mt-3 shadow-inner text-gray-900">
                <div className="bg-gray-100 rounded-md p-3 mb-2 text-center">
                  אחוז מימון: <b>{result.percent}%</b>
                </div>
                <div className="text-center font-bold text-xl">
                  משכנתא מקסימלית:<br/>₪{result.loan.toLocaleString()}
                </div>
              </div>
            )}

            {result && (
              <ReverseMortgageLoanComparison
                maxLoan={result.loan}
                interestRate={Number(interestRate) || 0}
                indexRate={Number(indexRate) || 0}
                months={Number(months) || 360}
              />
            )}
          </div>

          <div className="absolute bottom-0 left-0 w-full h-3.5 bg-black/20 blur-[2px]"/>
        </div>

        <div className="absolute -bottom-4.5 left-1/2 -translate-x-1/2 w-full h-2.5 bg-linear-to-b from-[#a9b7bf] to-[#6c7b84] rounded-b-xl shadow-md"/>
        <div className="absolute -bottom-7.5 left-1/2 -translate-x-1/2 w-95 h-5 bg-black/20 blur-2xl rounded-full"/>

      </div>
    </div>
  );
}












// "use client";

// import { useState } from "react";
// import CustomButton from "../../components/CustomButton";

// import ReverseMortgageLoanComparison from "./ReverseMortgageLoanComparison";

// type Result = {
//   loan: number;
//   percent: number;
//   decidingAge: number;
// } | null;

// export default function ReverseMortgageCalculator() {

//   const [propertyValue, setPropertyValue] = useState("");
//   const [age1, setAge1] = useState("");
//   const [age2, setAge2] = useState("");

//   const [months, setMonths] = useState("360");
//   const [indexRate, setIndexRate] = useState("");
//   const [interestRate, setInterestRate] = useState("");
//   const [result, setResult] = useState<Result>(null);

// const formatNumber = (value:string) => {

//   if(!value) return "";

//   return Number(
//     value.replace(/,/g,"")
//   ).toLocaleString("he-IL");

// };


//   const calculate = () => {

//     const value = Number(propertyValue);
//     const borrower1 = Number(age1);
//     const borrower2 = Number(age2);


//     if (!value || !borrower1) return;


//     if (borrower1 < 55) {
//       alert("גיל לווה חייב להיות מעל 55");
//       return;
//     }


//     if(age2 && borrower2 < 55){
//       alert("גיל לווה 2 חייב להיות מעל 55");
//       return;
//     }


//     const decidingAge =
//       age2
//       ? Math.min(borrower1, borrower2)
//       : borrower1;


//     const percent =
//       15 + Math.max(0, decidingAge - 55);


//     const loan =
//       value * (percent / 100);



//     setResult({
//       decidingAge,
//       percent,
//       loan
//     });

//   };



// return (

// <div className="
// flex justify-center items-start
// font-open-sans
// min-h-screen
// bg-linear-to-b
// from-[#f8fafc]
// to-[#e6eff3]
// pt-6 pb-6 mt-40 px-2
// ">

// <div className="
// relative
// w-full
// max-w-xl
// md:max-w-5xl
// ">


// {/* גוף מחשבון */}

// <div
// className="
// relative
// rounded-xl
// overflow-hidden
// p-5 sm:p-6
// "
// style={{
// background:
// "linear-gradient(180deg,#1d75a1 0%,#15516f 100%)",

// boxShadow:
// "0 20px 30px rgba(0,0,0,0.3), inset 0 2px 8px rgba(255,255,255,0.15)"
// }}
// >


// <div className="
// absolute top-0 left-0
// w-full h-2.5
// bg-white/20
// "/>



// <div className="
// flex flex-col
// items-center
// space-y-4
// text-white
// ">


// <h2 className="
// text-2xl sm:text-3xl
// font-extrabold
// tracking-wide
// drop-shadow-lg
// text-center
// ">
// משכנתא הפוכה
// </h2>


// <div className="
// w-full
// grid
// grid-cols-1 md:grid-cols-7
// gap-3
// items-end
// ">


// {/* שווי נכס */}

// <div className="flex flex-col gap-1">

// <div className="
// flex flex-col gap-1
// md:col-span-2
// ">


// <label className="text-sm font-semibold">
// שווי נכס
// </label>

// <input
// type="text"
// inputMode="numeric"
// placeholder="₪ שווי נכס"
// className="
// w-full
// rounded-md
// p-3
// text-gray-900
// bg-white
// shadow-inner
// focus:bg-orange-100
// focus:ring-2
// focus:ring-orange-300
// outline-none
// "
// value={
// propertyValue
// ?
// formatNumber(propertyValue)
// :
// ""
// }

// onChange={e=>
// setPropertyValue(
// e.target.value.replace(/,/g,"")
// )
// }
// />


// </div>

// </div>





// {/* גיל לווה 1 */}

// <div className="flex flex-col gap-1 md:col-span-1   ">

// <label className="text-sm font-semibold">
// גיל לווה 1
// </label>


// <input
// type="number"
// maxLength={3}
// placeholder="גיל"
// className="
// w-full
// rounded-md
// p-3
// text-gray-900
// bg-white
// shadow-inner
// focus:bg-orange-100
// focus:ring-2
// focus:ring-orange-300
// outline-none
// "
// value={age1}
// onChange={e=>
// setAge1(e.target.value.slice(0,3))
// }
// />


// </div>




// {/* גיל לווה 2 */}

// <div className="flex flex-col gap-1 md:col-span-1 ">


// <label className="text-sm font-semibold">

// גיל לווה 2

// <span className="text-xs opacity-80">
//  (רשות)
// </span>

// </label>


// <input
// type="number"
// maxLength={3}
// placeholder="גיל"
// className="
// w-full
// rounded-md
// p-3
// text-gray-900
// bg-white
// shadow-inner
// focus:bg-orange-100
// focus:ring-2
// focus:ring-orange-300
// outline-none
// "
// value={age2}
// onChange={e=>
// setAge2(e.target.value.slice(0,3))
// }
// />


// </div>

// {/* גיל קובע */}

// <div className="
// flex flex-col gap-1
// md:col-span-1
// md:max-w-20
// ">


// <label className="
// text-sm
// font-semibold
// text-white/90
// ">

// גיל קובע

// </label>


// <div
// className="
// h-11.5
// rounded-md
// px-3
// flex
// items-center
// justify-center
// bg-white/20
// backdrop-blur-sm
// border
// border-white/30
// shadow-inner
// font-bold
// "
// >

// {
// age1
// ?
// age2
// ?
// Math.min(Number(age1),Number(age2))
// :
// age1
// :
// "-"
// }


// </div>


// </div>






// {/* תקופה */}

// <div className="flex flex-col gap-1">


// <label className="text-sm font-semibold">

// תקופה (חודשים)

// </label>


// <input
// type="number"
// placeholder="360"
// className="
// w-full
// rounded-md
// p-3
// text-gray-900
// bg-white
// shadow-inner
// focus:bg-orange-100
// focus:ring-2
// focus:ring-orange-300
// outline-none
// "
// value={months}
// onChange={e=>setMonths(e.target.value)}
// />


// </div>

// {/* ריבית שנתית */}

// <div className="
// flex
// flex-col
// gap-1
// md:col-span-1
// ">


// <label className="text-sm font-semibold">

// ריבית שנתית %

// </label>


// <input
// type="number"
// step="0.01"
// placeholder="0"
// className="
// w-full
// rounded-md
// p-3
// text-gray-900
// bg-white
// shadow-inner
// focus:bg-orange-100
// focus:ring-2
// focus:ring-orange-300
// outline-none
// "
// value={interestRate}
// onChange={e=>setInterestRate(e.target.value)}
// />


// </div>

// {/* מדד */}
// <div className="
// flex
// flex-col
// gap-1
// md:col-span-1
// ">


//     <label className="text-sm font-semibold">

//     מדד שנתי משוער %

//     </label>


//     <input
//     type="number"
//     placeholder="0"
//     className="
//     w-full
//     rounded-md
//     p-3
//     text-gray-900
//     bg-white
//     shadow-inner
//     focus:bg-orange-100
//     focus:ring-2
//     focus:ring-orange-300
//     outline-none
//     "
//     value={indexRate}
//     onChange={e=>setIndexRate(e.target.value)}
//     />


// </div>



// </div>

// {/* כפתורי מחשבון */}
// <div className="flex flex-wrap justify-center items-center gap-3">
//   <CustomButton
//     text="חשב"
//     size="md"
//     onClick={calculate}
//   />

//   <CustomButton
//     text="נקה טופס"
//     size="md"
//     onClick={() => setResult(null)}
//   />
// </div>




// {
// result &&

// <div className="
// w-full
// bg-white
// rounded-xl
// p-4
// mt-3
// shadow-inner
// text-gray-900
// ">


// <div className="
// bg-gray-100
// rounded-md
// p-3
// mb-2
// text-center
// ">

// אחוז מימון:

// <b>
// {result.percent}%
// </b>

// </div>



// <div className="
// text-center
// font-bold
// text-xl
// ">

// משכנתא מקסימלית:

// <br/>

// ₪{result.loan.toLocaleString()}

// </div>


// </div>

// }

// {result && (
//   <ReverseMortgageLoanComparison
//     maxLoan={result.loan}
//     interestRate={Number(interestRate) || 0}
//     indexRate={Number(indexRate) || 0}
//     months={Number(months) || 360}
//   />
// )}
// </div>



// <div className="
// absolute bottom-0
// left-0
// w-full
// h-3.5
// bg-black/20
// blur-[2px]
// "/>


// </div>



// <div className="
// absolute
// -bottom-4.5
// left-1/2
// -translate-x-1/2
// w-full
// h-2.5
// bg-linear-to-b
// from-[#a9b7bf]
// to-[#6c7b84]
// rounded-b-xl
// shadow-md
// "/>



// <div className="
// absolute
// -bottom-7.5
// left-1/2
// -translate-x-1/2
// w-95
// h-5
// bg-black/20
// blur-2xl
// rounded-full
// "/>


// </div>


// </div>

// )

// }

