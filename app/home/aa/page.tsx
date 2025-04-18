'use client'
import { useState } from 'react'
import MortgageResultsModal from './MortgageResultsModal'
export default function MortgageSimulatorForm() {
  const [formData, setFormData] = useState({
    fullName: '',
    mortgagePurpose: '',
    hasPartner: '',
    age: '',
    spouseAge: '',
    monthlyIncome: '',
    spouseMonthlyIncome: '',
    additionalIncome: '',
    spouseAdditionalIncome: '',
    hasLongLoans: '',
    spouseHasLongLoans: '',
    equity: '',
    loanMonths: 360,
    annualInterest:5,
  })
  const [submitted, setSubmitted] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  // חישובים
  const income = parseFloat(formData.monthlyIncome || '0')
  const spouseIncome = parseFloat(formData.spouseMonthlyIncome || '0')
  const additional = parseFloat(formData.additionalIncome || '0')
  const spouseAdditional = parseFloat(formData.spouseAdditionalIncome || '0')
  const totalIncome = income + spouseIncome + additional + spouseAdditional
  const loansCount =
    parseFloat(formData.hasLongLoans || '0') +
    parseFloat(formData.spouseHasLongLoans || '0')

 
 
    // אחוז מימון מקסימלי לפי מטרת המשכנתא
  let maxFinancePercent = 0
  switch (formData.mortgagePurpose) {
    case 'single':
      maxFinancePercent = 75
      break
    case 'replacement':
      maxFinancePercent = 70
      break
    case 'additional':
      maxFinancePercent = 50
      break
    default:
      maxFinancePercent = 0
  }
  const minEquityPercent = 100 - maxFinancePercent
  const equity = parseFloat(formData.equity || '0')
  const maxPurchasePrice = minEquityPercent > 0 ? equity / (minEquityPercent / 100) : 0
  const maxMortgageAmount = maxPurchasePrice * (maxFinancePercent / 100);
  const disposableIncome = totalIncome - loansCount;
  const maxRepayment = disposableIncome * 0.4; // יחס החזר מקסימלי
  const recommendedRepayment = disposableIncome * 0.36; // יחס החזר מומלץ
  
  const maxLoan36 = calculateMaxMortgageByIncome(formData.annualInterest, recommendedRepayment, formData.loanMonths);
  const maxLoan40 = calculateMaxMortgageByIncome(formData.annualInterest, maxRepayment, formData.loanMonths);
  
  const finalMortgage = Math.min(maxMortgageAmount, maxLoan40);




  function calculateMaxMortgageByIncome(annualInterest: number, maxRepayment: number, loanMonths: number): number {
    const monthlyRate = annualInterest / 12 / 100;
    const pow = Math.pow(1 + monthlyRate, -loanMonths);
    const loanAmount = maxRepayment * ((1 - pow) / monthlyRate);
    return Math.round(loanAmount); // עיגול לסכום שלם
  }
  

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-8">
          <h2 className="text-2xl font-bold text-[#1d75a1] mb-6 text-center">סימולטור כמה משכנתא אוכל לקבל? </h2>
          <form onSubmit={handleSubmit} className="space-y-6">

            

            {/* שורה 2: מטרת המשכנתא */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="mortgagePurpose" className="block text-[#1d75a1] font-semibold mb-2">מטרת המשכנתא</label>
                <select
                  name="mortgagePurpose"
                  id="mortgagePurpose"
                  value={formData.mortgagePurpose}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
                >
                  <option value="">בחר...</option>
                  <option value="single">דירה יחידה</option>
                  <option value="replacement">דירה חליפית (במקום דירה קיימת)</option>
                  <option value="additional">דירה נוספת</option>
                </select>
              </div>
            </div>

            {/* שורה 3: זוגיות */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-[#1d75a1] font-semibold mb-2">האם יש בן/בת זוג או שותף?</p>
                <div className="flex items-center gap-6">
                  {['yes', 'no'].map(val => (
                    <label key={val} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="hasPartner"
                        value={val}
                        checked={formData.hasPartner === val}
                        onChange={handleChange}
                        className="focus:ring-[#1d75a1]"
                      />
                      <span className="text-[#1d75a1]">{val === 'yes' ? 'כן' : 'לא'}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* שורה 4: גיל */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="age" className="block text-[#1d75a1] font-semibold mb-2">גיל</label>
                <input
                  type="number"
                  name="age"
                  id="age"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="גיל"
                  className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
                />
              </div>
              {formData.hasPartner === 'yes' && (
                <div>
                  <label htmlFor="spouseAge" className="block text-[#1d75a1] font-semibold mb-2">גיל בן/בת זוג</label>
                  <input
                    type="number"
                    name="spouseAge"
                    id="spouseAge"
                    value={formData.spouseAge}
                    onChange={handleChange}
                    placeholder="גיל"
                    className=" [appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
                  />
                </div>
              )}
            </div>

            {/* שורה 5: הכנסות חודשיות */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="monthlyIncome" className="block text-[#1d75a1] font-semibold mb-2">הכנסות חודשיות (₪)</label>
                <input
                  type="number"
                  name="monthlyIncome"
                  id="monthlyIncome"
                  value={formData.monthlyIncome}
                  onChange={handleChange}
                  placeholder="₪"
                  className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
                />
              </div>
              {formData.hasPartner === 'yes' && (
                <div>
                  <label htmlFor="spouseMonthlyIncome" className="block text-[#1d75a1] font-semibold mb-2">בן/בת זוג </label>
                  <input
                    type="number"
                    name="spouseMonthlyIncome"
                    id="spouseMonthlyIncome"
                    value={formData.spouseMonthlyIncome}
                    onChange={handleChange}
                    placeholder="₪"
                    className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
                  />
                </div>
              )}
            </div>

            {/* שורה 6: הכנסות נוספות */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="additionalIncome" className="block text-[#1d75a1] font-semibold mb-2">הכנסות נוספות (₪)</label>
                <input
                  type="number"
                  name="additionalIncome"
                  id="additionalIncome"
                  value={formData.additionalIncome}
                  onChange={handleChange}
                  placeholder="₪"
                  className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
                />
              </div>
              {formData.hasPartner === 'yes' && (
                <div>
                  <label htmlFor="spouseAdditionalIncome" className="block text-[#1d75a1] font-semibold mb-2">הכנסות נוספות בן זוג </label>
                  <input
                    type="number"
                    name="spouseAdditionalIncome"
                    id="spouseAdditionalIncome"
                    value={formData.spouseAdditionalIncome}
                    onChange={handleChange}
                    placeholder="₪"
                    className="[appearance:textfield]  w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
                  />
                </div>
              )}
            </div>

            {/* שורה 7: הלוואות מעל 18 חודשים */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="hasLongLoans" className="block text-[#1d75a1] font-semibold mb-2">הלוואות מעל 18 חודשים </label>
                <input
                  type="number"
                  name="hasLongLoans"
                  id="hasLongLoans"
                  value={formData.hasLongLoans}
                  onChange={handleChange}
                  placeholder="מספר חודשים"
                  className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
                />
              </div>
              {formData.hasPartner === 'yes' && (
                <div>
                  <label htmlFor="spouseHasLongLoans" className="block text-[#1d75a1] font-semibold mb-2">בן זוג </label>
                  <input
                    type="number"
                    name="spouseHasLongLoans"
                    id="spouseHasLongLoans"
                    value={formData.spouseHasLongLoans}
                    onChange={handleChange}
                    placeholder="מספר חודשים"
                    className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
                  />
                </div>
              )}
            </div>

            {/* שורה 8: הון עצמי */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="equity" className="block text-[#1d75a1] font-semibold mb-2">הון עצמי (₪)</label>
                <input
                  type="number"
                  name="equity"
                  id="equity"
                  value={formData.equity}
                  onChange={handleChange}
                  placeholder="₪"
                  className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
                />
              </div>
           
            </div>

                 {/* שורה 9: מספר חודשים  */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label htmlFor="loanMonths" className="block text-[#1d75a1] font-semibold mb-2">מספר חודשי הלוואה</label>
                <input
                type="number"
                name="loanMonths"
                id="loanMonths"
                value={formData.loanMonths}
                onChange={handleChange}            
              
                className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
                />
            </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <label htmlFor="annualInterest" className="block text-[#1d75a1] font-semibold mb-2">ריבית שנתית</label>
    <div className="relative">
      <input
        type="number"
        step="0.01"
        name="annualInterest"
        id="annualInterest"
        value={formData.annualInterest}
        onChange={handleChange}
        placeholder="לדוג׳ 3.75"
        className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
      />
      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">%</span>
    </div>
  </div>
</div>












            {/* כפתור */}
            <div className="text-center">
            <button
                 onClick={() => setIsModalOpen(true)}
                  className="bg-[#1d75a1] hover:bg-[#13577c] text-white font-bold py-2 px-4 rounded"
              >      
            הצג תוצאות
            </button>
            </div>

            <MortgageResultsModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      data={{
        totalIncome,
        loansCount,
        disposableIncome,
        maxFinancePercent,
        minEquityPercent,
        maxPurchasePrice,
        maxMortgageAmount,
        maxRepayment,
        recommendedRepayment,
        maxLoan36,
        maxLoan40,
        finalMortgage,
        loanMonths: formData.loanMonths, // ← מוסיף את זה כאן
        annualInterest:formData.annualInterest,
      }}
      />





          </form>

          {/* תוצאה */}
          
        </div>
      </div>
    </div>
  )
}



// 'use client'
// import { useState } from 'react'

// export default function MortgageSimulatorForm() {
//   const [formData, setFormData] = useState({
//     fullName: '',
//     mortgagePurpose: '',
//     hasPartner: '',
//     age: '',
//     spouseAge: '',
//     monthlyIncome: '',
//     spouseMonthlyIncome: '',
//     additionalIncome: '',
//     spouseAdditionalIncome: '',
//     hasLongLoans: '',
//     spouseHasLongLoans: '',
//     equity: '',
//     loanMonths: 360,
//     annualInterest:5,
//   })
//   const [submitted, setSubmitted] = useState(false)

//   const handleChange = (
//     e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
//   ) => {
//     const { name, value } = e.target
//     setFormData(prev => ({ ...prev, [name]: value }))
//   }

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault()
//     setSubmitted(true)
//   }

//   חישובים
//   const income = parseFloat(formData.monthlyIncome || '0')
//   const spouseIncome = parseFloat(formData.spouseMonthlyIncome || '0')
//   const additional = parseFloat(formData.additionalIncome || '0')
//   const spouseAdditional = parseFloat(formData.spouseAdditionalIncome || '0')
//   const totalIncome = income + spouseIncome + additional + spouseAdditional
//   const loansCount =
//     parseFloat(formData.hasLongLoans || '0') +
//     parseFloat(formData.spouseHasLongLoans || '0')

 
 
//     אחוז מימון מקסימלי לפי מטרת המשכנתא
//   let maxFinancePercent = 0
//   switch (formData.mortgagePurpose) {
//     case 'single':
//       maxFinancePercent = 75
//       break
//     case 'replacement':
//       maxFinancePercent = 70
//       break
//     case 'additional':
//       maxFinancePercent = 50
//       break
//     default:
//       maxFinancePercent = 0
//   }
//   const minFinancePercent = 100 - maxFinancePercent
//   const equity = parseFloat(formData.equity || '0')
//   const maxPurchasePrice = minFinancePercent > 0 ? equity / (minFinancePercent / 100) : 0
//   const maxMortgageAmount = maxPurchasePrice * (maxFinancePercent / 100);
//   const disposableIncome = totalIncome - loansCount;
//   const maxRepayment = disposableIncome * 0.4; // יחס החזר מקסימלי
//   const recommendedRepayment = disposableIncome * 0.36; // יחס החזר מומלץ
  
//   const maxLoan36 = calculateMaxMortgageByIncome(formData.annualInterest, recommendedRepayment, formData.loanMonths);
//   const maxLoan40 = calculateMaxMortgageByIncome(formData.annualInterest, maxRepayment, formData.loanMonths);
  
//   const finalMortgage = Math.min(maxMortgageAmount, maxLoan40);




//   function calculateMaxMortgageByIncome(annualInterest: number, maxRepayment: number, loanMonths: number): number {
//     const monthlyRate = annualInterest / 12 / 100;
//     const pow = Math.pow(1 + monthlyRate, -loanMonths);
//     const loanAmount = maxRepayment * ((1 - pow) / monthlyRate);
//     return Math.round(loanAmount); // עיגול לסכום שלם
//   }
  

//   return (
//     <div className="min-h-screen bg-gray-50 py-10 px-4">
//       <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
//         <div className="p-8">
//           <h2 className="text-2xl font-bold text-[#1d75a1] mb-6 text-center">סימולטור כמה משכנתא אוכל לקבל? </h2>
//           <form onSubmit={handleSubmit} className="space-y-6">

//             {/* שורה 1: שם מלא */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <label htmlFor="fullName" className="block text-[#1d75a1] font-semibold mb-2">שם מלא</label>
//                 <input
//                   type="text"
//                   name="fullName"
//                   id="fullName"
//                   value={formData.fullName}
//                   onChange={handleChange}
//                   placeholder="הקלד/י את שמך"
//                   className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
//                 />
//               </div>
//             </div>

//             {/* שורה 2: מטרת המשכנתא */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <label htmlFor="mortgagePurpose" className="block text-[#1d75a1] font-semibold mb-2">מטרת המשכנתא</label>
//                 <select
//                   name="mortgagePurpose"
//                   id="mortgagePurpose"
//                   value={formData.mortgagePurpose}
//                   onChange={handleChange}
//                   className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
//                 >
//                   <option value="">בחר...</option>
//                   <option value="single">דירה יחידה</option>
//                   <option value="replacement">דירה חליפית (במקום דירה קיימת)</option>
//                   <option value="additional">דירה נוספת</option>
//                 </select>
//               </div>
//             </div>

//             {/* שורה 3: זוגיות */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <p className="text-[#1d75a1] font-semibold mb-2">האם יש בן/בת זוג או שותף?</p>
//                 <div className="flex items-center gap-6">
//                   {['yes', 'no'].map(val => (
//                     <label key={val} className="flex items-center gap-2">
//                       <input
//                         type="radio"
//                         name="hasPartner"
//                         value={val}
//                         checked={formData.hasPartner === val}
//                         onChange={handleChange}
//                         className="focus:ring-[#1d75a1]"
//                       />
//                       <span className="text-[#1d75a1]">{val === 'yes' ? 'כן' : 'לא'}</span>
//                     </label>
//                   ))}
//                 </div>
//               </div>
//             </div>

//             {/* שורה 4: גיל */}
//             <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
//               <div>
//                 <label htmlFor="age" className="block text-[#1d75a1] font-semibold mb-2">גיל</label>
//                 <input
//                   type="number"
//                   name="age"
//                   id="age"
//                   value={formData.age}
//                   onChange={handleChange}
//                   placeholder="גיל"
//                   className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
//                 />
//               </div>
//               {formData.hasPartner === 'yes' && (
//                 <div>
//                   <label htmlFor="spouseAge" className="block text-[#1d75a1] font-semibold mb-2">גיל בן/בת זוג</label>
//                   <input
//                     type="number"
//                     name="spouseAge"
//                     id="spouseAge"
//                     value={formData.spouseAge}
//                     onChange={handleChange}
//                     placeholder="גיל"
//                     className=" [appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
//                   />
//                 </div>
//               )}
//             </div>

//             {/* שורה 5: הכנסות חודשיות */}
//             <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
//               <div>
//                 <label htmlFor="monthlyIncome" className="block text-[#1d75a1] font-semibold mb-2">הכנסות חודשיות (₪)</label>
//                 <input
//                   type="number"
//                   name="monthlyIncome"
//                   id="monthlyIncome"
//                   value={formData.monthlyIncome}
//                   onChange={handleChange}
//                   placeholder="₪"
//                   className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
//                 />
//               </div>
//               {formData.hasPartner === 'yes' && (
//                 <div>
//                   <label htmlFor="spouseMonthlyIncome" className="block text-[#1d75a1] font-semibold mb-2">בן/בת זוג </label>
//                   <input
//                     type="number"
//                     name="spouseMonthlyIncome"
//                     id="spouseMonthlyIncome"
//                     value={formData.spouseMonthlyIncome}
//                     onChange={handleChange}
//                     placeholder="₪"
//                     className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
//                   />
//                 </div>
//               )}
//             </div>

//             {/* שורה 6: הכנסות נוספות */}
//             <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
//               <div>
//                 <label htmlFor="additionalIncome" className="block text-[#1d75a1] font-semibold mb-2">הכנסות נוספות (₪)</label>
//                 <input
//                   type="number"
//                   name="additionalIncome"
//                   id="additionalIncome"
//                   value={formData.additionalIncome}
//                   onChange={handleChange}
//                   placeholder="₪"
//                   className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
//                 />
//               </div>
//               {formData.hasPartner === 'yes' && (
//                 <div>
//                   <label htmlFor="spouseAdditionalIncome" className="block text-[#1d75a1] font-semibold mb-2">הכנסות נוספות בן זוג </label>
//                   <input
//                     type="number"
//                     name="spouseAdditionalIncome"
//                     id="spouseAdditionalIncome"
//                     value={formData.spouseAdditionalIncome}
//                     onChange={handleChange}
//                     placeholder="₪"
//                     className="[appearance:textfield]  w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
//                   />
//                 </div>
//               )}
//             </div>

//             {/* שורה 7: הלוואות מעל 18 חודשים */}
//             <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
//               <div>
//                 <label htmlFor="hasLongLoans" className="block text-[#1d75a1] font-semibold mb-2">הלוואות מעל 18 חודשים </label>
//                 <input
//                   type="number"
//                   name="hasLongLoans"
//                   id="hasLongLoans"
//                   value={formData.hasLongLoans}
//                   onChange={handleChange}
//                   placeholder="מספר חודשים"
//                   className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
//                 />
//               </div>
//               {formData.hasPartner === 'yes' && (
//                 <div>
//                   <label htmlFor="spouseHasLongLoans" className="block text-[#1d75a1] font-semibold mb-2">בן זוג </label>
//                   <input
//                     type="number"
//                     name="spouseHasLongLoans"
//                     id="spouseHasLongLoans"
//                     value={formData.spouseHasLongLoans}
//                     onChange={handleChange}
//                     placeholder="מספר חודשים"
//                     className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
//                   />
//                 </div>
//               )}
//             </div>

//             {/* שורה 8: הון עצמי */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <label htmlFor="equity" className="block text-[#1d75a1] font-semibold mb-2">הון עצמי (₪)</label>
//                 <input
//                   type="number"
//                   name="equity"
//                   id="equity"
//                   value={formData.equity}
//                   onChange={handleChange}
//                   placeholder="₪"
//                   className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
//                 />
//               </div>
           
//             </div>

//                  {/* שורה 9: מספר חודשים  */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//              <div>
//                 <label htmlFor="loanMonths" className="block text-[#1d75a1] font-semibold mb-2">מספר חודשי הלוואה</label>
//                 <input
//                 type="number"
//                 name="loanMonths"
//                 id="loanMonths"
//                 value={formData.loanMonths}
//                 onChange={handleChange}            
              
//                 className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
//                 />
//             </div>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//   <div>
//     <label htmlFor="annualInterest" className="block text-[#1d75a1] font-semibold mb-2">ריבית שנתית</label>
//     <div className="relative">
//       <input
//         type="number"
//         step="0.01"
//         name="annualInterest"
//         id="annualInterest"
//         value={formData.annualInterest}
//         onChange={handleChange}
//         placeholder="לדוג׳ 3.75"
//         className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-[#1d75a1] focus:bg-orange-100 text-gray-700"
//       />
//       <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">%</span>
//     </div>
//   </div>
// </div>












//             {/* כפתור */}
//             <div className="text-center">
//               <button
//                 type="submit"
//                 className="mt-4 inline-block bg-[#1d75a1] text-white font-semibold py-2 px-6 rounded-lg hover:opacity-90 transition"
//               >
//                 חשב זכאות
//               </button>
//             </div>

//           </form>

//           {/* תוצאה */}
//           {submitted && (
//             <div className="mt-8 p-4 bg-green-50 rounded-lg text-gray-800">
//               <p>סה"כ הכנסות: ₪{totalIncome.toLocaleString()}</p>
//               <p>סה"כ הלוואות מעל 18 חודשים: {loansCount}</p>
//               <p>הכנסה פנויה:  ₪{Math.round(disposableIncome).toLocaleString()}</p>
//               <p>אחוז מימון מקסימלי: {maxFinancePercent}%</p>          
//               <p>אחוז מימון מינימלי: {minFinancePercent}%</p>
//               <p>מחיר קנייה מקסימלי לפי הון עצמי: {` ${Math.round(maxPurchasePrice).toLocaleString()}₪`}</p>
//               <p>משכנתא מקסימלית לפי הון עצמי: ₪{Math.round(maxMortgageAmount).toLocaleString()} </p>
//               <p>יחס החזר מקסימלי (40%): ₪{Math.round(maxRepayment).toLocaleString()}</p>
//               <p>יחס החזר מומלץ (36%): ₪{Math.round(recommendedRepayment).toLocaleString()}</p>
//               <p>משכנתא מקסימלית לפי יחס החזר 36%: {maxLoan36.toLocaleString()} ₪</p>
//               <p>משכנתא מקסימלית לפי יחס החזר 40%: {maxLoan40.toLocaleString()} ₪</p>

//               <div className="bg-white p-4 rounded-xl shadow-md space-y-2 text-right">
                
//                 <p className="text-lg text-[#1d75a1] font-bold border-t pt-2">
//                     ✅ <strong>משכנתא מקסימלית סופית:</strong> {finalMortgage.toLocaleString()} ₪
//                 </p>
//                 </div>


//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   )
// }
