"use client";

import { useMemo } from "react";

type Props = {
  loan: number;
  interestRate: number;
  indexRate: number;
  months: number;
  type: "balloon" | "grace";
};

export default function ReverseMortgageAmortizationTable({
  loan,
  interestRate,
  indexRate,
  months,
  type
}: Props) {

  const table = useMemo(() => {
    const yearlyInterest = interestRate / 100;
    const yearlyIndex = indexRate / 100;

    const monthlyInterest = Math.pow(1 + yearlyInterest, 1 / 12) - 1;
    const monthlyIndex = Math.pow(1 + yearlyIndex, 1 / 12) - 1;

    // חודש 0 המייצג את קבלת המשכנתא
    const initialRow = {
      month: 0,
      startBalance: 0,
      interest: 0,
      index: 0,
      payment: 0,
      endBalance: loan
    };

    /*
    =====================
    בלון מלא (אין תשלום שוטף, הכל נדחה וי.ס גדלה)
    =====================
    */
    let balloonBalance = loan;
    const balloonRows = [initialRow];

    for (let m = 1; m <= months; m++) {
      const startBalance = balloonBalance;

      // 1. חישוב ריבית חודשית והוספתה לחוב
      const interest = startBalance * monthlyInterest;
      balloonBalance += interest;

      // 2. חישוב הצמדה על היתרה החדשה
      const index = balloonBalance * monthlyIndex;
      balloonBalance += index;

      balloonRows.push({
        month: m,
        startBalance,
        interest,
        index,
        payment: 0, // אין תשלום חודשי בבלון מלא
        endBalance: balloonBalance
      });
    }

    /*
    =====================
    גרייס / בלון חלקי (הריבית משולמת מדי חודש, הקרן גדלה רק לפי המדד)
    =====================
    */
    let graceBalance = loan;
    const graceRows = [initialRow];

    for (let m = 1; m <= months; m++) {
      const startBalance = graceBalance;

      // הריבית משולמת בפועל באותו חודש מתוך היתרה הנוכחית
      const interestPayment = startBalance * monthlyInterest;

      // הקרן עצמה צוברת מדד וגדלה
      const index = startBalance * monthlyIndex;
      graceBalance += index;

      graceRows.push({
        month: m,
        startBalance,
        interest: interestPayment,
        index,
        payment: interestPayment, // התשלום החודשי הוא הריבית בלבד
        endBalance: graceBalance
      });
    }

    return {
      balloonRows,
      graceRows
    };
  }, [loan, interestRate, indexRate, months]);

  const rows = type === "balloon" ? table.balloonRows : table.graceRows;

  return (
    <div className="w-full">
      <div className="mb-4 bg-gray-100 rounded-xl p-3 text-center font-bold text-blue-900">
        {type === "balloon" ? "בלון מלא - דחיית קרן וריבית" : "גרייס - תשלום ריבית בלבד"}
      </div>

      <div className="overflow-auto max-h-[65vh] rounded-xl border">
        <table className="w-full text-sm text-gray-800 text-center">
          <thead className="sticky top-0 bg-gray-200">
            <tr>
              <th className="p-3">חודש</th>
              <th className="p-3">יתרת פתיחה (י.פ)</th>
              <th className="p-3">ריבית חודשית</th>
              <th className="p-3">הצמדה למדד</th>
              <th className="p-3">תשלום חודשי</th>
              <th className="p-3">יתרת סגירה (י.ס)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month} className="border-b hover:bg-gray-50">
                <td className="p-3 font-semibold">{row.month}</td>
                <td className="p-3">
                  {row.month === 0 ? "-" : `₪${Math.round(row.startBalance).toLocaleString()}`}
                </td>
                <td className="p-3">
                  {row.month === 0 ? "-" : `₪${Math.round(row.interest).toLocaleString()}`}
                </td>
                <td className="p-3">
                  {row.month === 0 ? "-" : `₪${Math.round(row.index).toLocaleString()}`}
                </td>
                <td className="p-3 font-bold text-orange-600">
                  {row.month === 0 ? "-" : `₪${Math.round(row.payment).toLocaleString()}`}
                </td>
                <td className="p-3 font-bold text-blue-900">
                  ₪{Math.round(row.endBalance).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}















// "use client";

// import { useMemo } from "react";


// type Props = {
//  loan:number;
//  interestRate:number;
//  indexRate:number;
//  months:number;
//  type:"balloon"|"grace";
// }





// export default function ReverseMortgageAmortizationTable({
//   loan,
//   interestRate,
//   indexRate,
//   months
// }: Props) {

//   const table = useMemo(() => {

//     const r = interestRate / 100;
//     const i = indexRate / 100;

//     const monthlyR = Math.pow(1 + r, 1 / 12) - 1;
//     const monthlyI = Math.pow(1 + i, 1 / 12) - 1;

//     // --------------------
//     // בלון מלא
//     // --------------------
//     let balloonBalance = loan;

//     const balloonRows = [];

//     let balloonInterest = 0;
//     let balloonIndex = 0;

//     for (let m = 1; m <= months; m++) {

//       const interest = balloonBalance * monthlyR;
//       balloonBalance += interest;

//       const index = balloonBalance * monthlyI;
//       balloonBalance += index;

//       balloonInterest += interest;
//       balloonIndex += index;

//       balloonRows.push({
//         month: m,
//         balance: balloonBalance
//       });
//     }

//     // --------------------
//     // גרייס
//     // --------------------
//     let graceBalance = loan;

//     const graceRows = [];

//     let graceInterest = 0;
//     let graceIndex = 0;

//     for (let m = 1; m <= months; m++) {

//       const interestPayment = graceBalance * monthlyR;
//       const index = graceBalance * monthlyI;

//       graceInterest += interestPayment;
//       graceIndex += index;

//       graceBalance += index;

//       graceRows.push({
//         month: m,
//         interest: interestPayment,
//         index,
//         balance: graceBalance
//       });
//     }

//     return {
//       balloonRows,
//       graceRows,
//       summary: {
//         balloonFinal: balloonBalance,
//         graceFinal: graceBalance,
//         balloonInterest,
//         balloonIndex,
//         graceInterest,
//         graceIndex
//       }
//     };

//   }, [loan, interestRate, indexRate, months]);


// return (

// <div>


// {
// type==="balloon"

// ?

// <div className="
// bg-white
// rounded-xl
// p-4
// ">

// <h3 className="
// font-bold
// text-blue-900
// mb-3
// ">

// לוח סילוקין - בלון מלא

// </h3>


// <table className="w-full text-sm">


// <thead>

// <tr className="bg-gray-100">

// <th>חודש</th>
// <th>יתרה</th>

// </tr>

// </thead>


// <tbody>


// {
// table.balloonRows.map(row=>(

// <tr key={row.month}
// className="border-b">

// <td>
// {row.month}
// </td>


// <td>
// ₪{Math.round(row.balance).toLocaleString()}
// </td>


// </tr>

// ))
// }


// </tbody>

// </table>


// </div>



// :


// <div className="
// bg-white
// rounded-xl
// p-4
// ">


// <h3 className="
// font-bold
// text-blue-900
// mb-3
// ">

// לוח סילוקין - גרייס

// </h3>


// <table className="w-full text-sm">


// <thead>

// <tr className="bg-gray-100">

// <th>חודש</th>
// <th>ריבית</th>
// <th>מדד</th>
// <th>יתרה</th>

// </tr>

// </thead>


// <tbody>


// {
// table.graceRows.map(row=>(

// <tr key={row.month}
// className="border-b">


// <td>{row.month}</td>

// <td>
// ₪{Math.round(row.interest).toLocaleString()}
// </td>

// <td>
// ₪{Math.round(row.index).toLocaleString()}
// </td>


// <td className="font-bold">

// ₪{Math.round(row.balance).toLocaleString()}

// </td>


// </tr>

// ))
// }


// </tbody>

// </table>


// </div>

// }


// </div>

// );


//   //return
  







//   //(
//     // <div className="w-full space-y-10 mt-6">

//     //   {/* ================== בלון ================== */}
//     //   <div className="bg-white rounded-xl p-4 shadow-inner">
//     //     <h3 className="text-lg font-bold text-blue-900 mb-3">
//     //       לוח סילוקין - בלון מלא
//     //     </h3>

//     //     <div className="overflow-auto max-h-96">
//     //       <table className="w-full text-sm text-gray-700">
//     //         <thead>
//     //           <tr className="bg-gray-100">
//     //             <th className="p-2">חודש</th>
//     //             <th className="p-2">יתרה</th>
//     //           </tr>
//     //         </thead>

//     //         <tbody>
//     //           {table.balloonRows.slice(0, 60).map((row) => (
//     //             <tr key={row.month} className="border-b">
//     //               <td className="p-2">{row.month}</td>
//     //               <td className="p-2">
//     //                 ₪{row.balance.toLocaleString()}
//     //               </td>
//     //             </tr>
//     //           ))}
//     //         </tbody>
//     //       </table>
//     //     </div>
//     //   </div>

//     //   {/* ================== גרייס ================== */}
//     //   <div className="bg-white rounded-xl p-4 shadow-inner">
//     //     <h3 className="text-lg font-bold text-blue-900 mb-3">
//     //       לוח סילוקין - גרייס (ריבית בלבד)
//     //     </h3>

//     //     <div className="overflow-auto max-h-96">
//     //       <table className="w-full text-sm text-gray-700">
//     //         <thead>
//     //           <tr className="bg-gray-100">
//     //             <th className="p-2">חודש</th>
//     //             <th className="p-2">ריבית</th>
//     //             <th className="p-2">מדד</th>
//     //             <th className="p-2">יתרה</th>
//     //           </tr>
//     //         </thead>

//     //         <tbody>
//     //           {table.graceRows.slice(0, 60).map((row) => (
//     //             <tr key={row.month} className="border-b">
//     //               <td className="p-2">{row.month}</td>
//     //               <td className="p-2">
//     //                 ₪{row.interest.toLocaleString()}
//     //               </td>
//     //               <td className="p-2">
//     //                 ₪{row.index.toLocaleString()}
//     //               </td>
//     //               <td className="p-2 font-bold">
//     //                 ₪{row.balance.toLocaleString()}
//     //               </td>
//     //             </tr>
//     //           ))}
//     //         </tbody>
//     //       </table>
//     //     </div>
//     //   </div>

//     // </div>
//   //);
// }