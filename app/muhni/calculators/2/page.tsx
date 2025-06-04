// "use client"
// import React, { useEffect } from "react";

// type LoanData = {
//   loanAmount: number;
//   annualInterest: number;
//   isLinkedToIndex: string;
//   months: number;
//   monthlyPayment: number;
// };

// const loanRows: LoanData[] = [
//   {
//     loanAmount: 250000,
//     annualInterest: 3.5,
//     isLinkedToIndex: "מדד",
//     months: 180,
//     monthlyPayment: 1787,
//   },
//   {
//     loanAmount: 320000,
//     annualInterest: 2.8,
//     isLinkedToIndex: "פריים",
//     months: 240,
//     monthlyPayment: 1532,
//   },
//   {
//     loanAmount: 180000,
//     annualInterest: 4.1,
//     isLinkedToIndex: "לא צמוד",
//     months: 120,
//     monthlyPayment: 1827,
//   },
// ];

// const LoanTable = () => {
//   useEffect(() => {
//     loanRows.forEach((loan, index) => {
//       const monthArray = Array.from({ length: loan.months }, (_, i) => i + 1);
//       console.log(`שורת הלוואה ${index + 1}:`, monthArray);
//     });
//   }, []);



// const rows = [];
//   let remainingPrincipal = loanAmount;

//   for (let month = 0; month <= months; month++) {
//     if (month === 0) {
//       rows.push({
//         month,
//         openingBalance: null,
//         principal: null,
//         interest: null,
//         payment: null,
//         closingBalance: +loanAmount.toFixed(2),
//       });
//     } else {
//       const interestPayment = remainingPrincipal * monthlyInterest * (1 + monthlyIndex);
//       const payment = monthlyPayment * Math.pow(1 + monthlyIndex, month);
//       const principalPayment = payment - interestPayment;

//       const openingBalance = remainingPrincipal;
//       const closingBalance = (openingBalance * (1 + monthlyIndex)) - principalPayment;

//       rows.push({
//         month,
//         openingBalance: +openingBalance.toFixed(2),
//         principal: +principalPayment.toFixed(2),
//         interest: +interestPayment.toFixed(2),
//         payment: +payment.toFixed(2),
//         closingBalance: +Math.max(closingBalance, 0).toFixed(2),
//       });

//       remainingPrincipal = closingBalance;
//     }
//   }











//   return (
//     <div className="overflow-x-auto p-4">
//       <table className="min-w-full border border-gray-300 text-sm text-center">
//         <thead className="bg-gray-100">
//           <tr>
//             <th className="border px-4 py-2">סכום הלוואה</th>
//             <th className="border px-4 py-2">ריבית</th>
//             <th className="border px-4 py-2">צמוד</th>
//             <th className="border px-4 py-2">מספר חודשים</th>
//             <th className="border px-4 py-2">תשלום חודשי</th>
//           </tr>
//         </thead>
//         <tbody>
//           {loanRows.map((loan, index) => (
//             <tr key={index} className={index % 2 === 1 ? "bg-gray-50" : ""}>
//               <td className="border px-4 py-2">₪{loan.loanAmount.toLocaleString()}</td>
//               <td className="border px-4 py-2">{loan.annualInterest}%</td>
//               <td className="border px-4 py-2">{loan.isLinkedToIndex}</td>
//               <td className="border px-4 py-2">{loan.months}</td>
//               <td className="border px-4 py-2">₪{loan.monthlyPayment.toLocaleString()}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// };

// export default LoanTable;
