import { FC } from "react";

interface MortgageResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    totalIncome: number;
    loansCount: number;
    disposableIncome: number;
    maxFinancePercent: number;
    minEquityPercent: number;
    maxPurchasePrice: number;
    maxMortgageAmount: number;
    maxRepayment: number;
    recommendedRepayment: number;
    maxLoan36: number;
    maxLoan40: number;
    finalMortgage: number;
    annualInterest: number;
    loanMonths: number;
  };
}

const MortgageResultsModal: FC<MortgageResultsModalProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen) return null;
  
  const monthlyInterest = (data.annualInterest / 100) / 12;

  const monthlyPayment = 
    (data.finalMortgage * monthlyInterest) /
    (1 - Math.pow(1 + monthlyInterest, -data.loanMonths));
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full relative overflow-y-auto max-h-[90vh]">
        {/* כפתור סגירה עליון מוגדל */}
        <button
          className="absolute top-4 left-4 text-gray-600 hover:text-red-500 text-4xl font-bold"
          onClick={onClose}
          aria-label="סגור"
        >
          ×
        </button>

        <h2 className="text-xl font-bold text-[#1d75a1] mb-6 text-right">תוצאות חישוב משכנתא</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right text-gray-800">
          {/* טור ראשון - עיקרי */}
          <div className="space-y-3">           
         
            <div className="bg-green-50 p-4 rounded-xl shadow space-y-2">
              <p className="text-lg text-[#1d75a1] font-bold border-t pt-2">
               <strong>משכנתא מקסימלית סופית:</strong> ₪{Math.round(data.finalMortgage).toLocaleString()}
              </p>
              <p className="text-lg text-[#1d75a1] font-bold border-t pt-2">
               <strong>דירה בשווי</strong> ₪{Math.round(data.finalMortgage/(data.maxFinancePercent/100)).toLocaleString()}
              </p>
              <p className="text-lg text-[#1d75a1] font-bold border-t pt-2" >
               <strong> הון עצמי נדרש לעסקה:</strong>
                ₪{Math.round((data.finalMortgage / (data.maxFinancePercent / 100)) - data.finalMortgage).toLocaleString()}
              </p>
              <p className="text-lg text-[#1d75a1] font-bold border-t pt-2" >
                תשלום חודשי עבור משכנתא זו: ₪
                {Math.round(
                    (data.finalMortgage * ((data.annualInterest / 100) / 12)) /
                    (1 - Math.pow(1 + ((data.annualInterest / 100) / 12), -data.loanMonths))
                ).toLocaleString()}
                </p>

              <p className="text-lg text-[#1d75a1] font-bold border-t pt-2" >
               <strong>לפי ריבית:</strong>
               {data.annualInterest}%
              </p>
              <p className="text-lg text-[#1d75a1] font-bold border-t pt-2" >
               <strong>מספר חודשי הלוואה:</strong>
               {data.loanMonths}
              </p>


            
            </div>
          </div>

          {/* טור שני - נתוני עזר */}
          <div className="text-sm text-gray-600 space-y-2">
            <h3 className="text-[#1d75a1] font-bold text-base mb-2">נתוני עזר</h3>
            <p>סה"כ הכנסות: ₪{data.totalIncome.toLocaleString()}</p>
            <p>סה"כ הלוואות מעל 18 חודשים: {data.loansCount}</p>
            <p>הכנסה פנויה: ₪{Math.round(data.disposableIncome).toLocaleString()}</p>
            <p>אחוז מימון מקסימלי: {data.maxFinancePercent}%</p>
            <p>אחוז הון מינימלי: {data.minEquityPercent}%</p>
            <p>מחיר קנייה מקסימלי לפי הון עצמי: ₪{Math.round(data.maxPurchasePrice).toLocaleString()}</p>
            <p>משכנתא מקסימלית לפי הון עצמי: ₪{Math.round(data.maxMortgageAmount).toLocaleString()}</p>
            <p>יחס החזר מקסימלי (40%): ₪{Math.round(data.maxRepayment).toLocaleString()}</p>
            <p>יחס החזר מומלץ (36%): ₪{Math.round(data.recommendedRepayment).toLocaleString()}</p>
            <p>משכנתא לפי יחס החזר 36%: ₪{Math.round(data.maxLoan36).toLocaleString()}</p>
            <p>משכנתא לפי יחס החזר 40%: ₪{Math.round(data.maxLoan40).toLocaleString()}</p>
          </div>
        </div>

        {/* כפתור סגירה תחתון */}
        <div className="mt-8 text-center">
          <button
            onClick={onClose}
            className="bg-[#1d75a1] text-white px-6 py-2 rounded-full hover:bg-[#155d80] transition"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};

export default MortgageResultsModal;















// import { FC } from "react";

// interface MortgageResultsModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   data: {
//     totalIncome: number;
//     loansCount: number;
//     disposableIncome: number;
//     maxFinancePercent: number;
//     minEquityPercent: number;
//     maxPurchasePrice: number;
//     maxMortgageAmount: number;
//     maxRepayment: number;
//     recommendedRepayment: number;
//     maxLoan36: number;
//     maxLoan40: number;
//     finalMortgage: number;
//     annualInterest: number;
//     loanMonths: number; // ← תוסיף לשדה ה־data
//   };
// }

// const MortgageResultsModal: FC<MortgageResultsModalProps> = ({ isOpen, onClose, data }) => {
//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
//       <div className="bg-white rounded-lg p-6 max-w-2xl w-full relative">
//         <button
//           className="absolute top-2 left-2 text-gray-600 hover:text-red-500"
//           onClick={onClose}
//         >
//           ✖
//         </button>
//         <h2 className="text-xl font-bold text-[#1d75a1] mb-4 text-right">תוצאות חישוב משכנתא</h2>

//         <div className="space-y-2 text-right text-gray-800">
//           <p>סה"כ הכנסות: ₪{data.totalIncome.toLocaleString()}</p>
//           <p>סה"כ הלוואות מעל 18 חודשים: {data.loansCount}</p>
//           <p>הכנסה פנויה: ₪{Math.round(data.disposableIncome).toLocaleString()}</p>
//           <p>אחוז מימון מקסימלי: {data.maxFinancePercent}%</p>
//           <p>אחוז הון מינימלי: {data.minEquityPercent}%</p>
//           <p>מחיר קנייה מקסימלי לפי הון עצמי: ₪{Math.round(data.maxPurchasePrice).toLocaleString()}</p>
//           <p>משכנתא מקסימלית לפי הון עצמי: ₪{Math.round(data.maxMortgageAmount).toLocaleString()}</p>
//           <p>יחס החזר מקסימלי (40%): ₪{Math.round(data.maxRepayment).toLocaleString()}</p>
//           <p>יחס החזר מומלץ (36%): ₪{Math.round(data.recommendedRepayment).toLocaleString()}</p>
//           <p>משכנתא לפי יחס החזר 36%: ₪{Math.round(data.maxLoan36).toLocaleString()}</p>
//           <p>משכנתא לפי יחס החזר 40%: ₪{Math.round(data.maxLoan40).toLocaleString()}</p>
//           <p> לפי ריבית: %{data.annualInterest}</p>
//           <p>מספר חודשי הלוואה: {data.loanMonths}</p>
//           <div className="bg-green-50 p-4 rounded-xl shadow space-y-2">
//             <p className="text-lg text-[#1d75a1] font-bold border-t pt-2">
//               ✅ <strong>משכנתא מקסימלית סופית:</strong> ₪{Math.round(data.finalMortgage).toLocaleString()}
//             </p>
//             <p className="text-lg text-[#1d75a1] font-bold border-t pt-2">
             
//             </p>
           

         
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default MortgageResultsModal;
