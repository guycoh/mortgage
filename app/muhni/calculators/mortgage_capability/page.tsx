'use client'
import { useState,useEffect  } from 'react'
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
  });
 
  const [errors, setErrors] = useState({
    mortgagePurpose: '',
    age: '',
    monthlyIncome: '',
    equity: '',
    loanMonths: '',
    annualInterest: '',
  });
  
 
  const [displayData, setDisplayData] = useState({
    monthlyIncome: '',
    spouseMonthlyIncome: '',
    additionalIncome: '',
    spouseAdditionalIncome: '',
    hasLongLoans: '',
    spouseHasLongLoans: '',
    equity: '',


  });

  const [isFormValid, setIsFormValid] = useState(false);



  const [isModalOpen, setIsModalOpen] = useState(false);

  function formatWithCommas(value: string): string {
    const numeric = value.replace(/[^\d]/g, '');
    return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  
  function extractNumeric(value: string): number {
    const cleaned = value.replace(/,/g, '');
    return parseFloat(cleaned) || 0;
  }

  const validateForm = () => {
    const newErrors: typeof errors = {
      mortgagePurpose: '',
      age: '',
      monthlyIncome: '',
      equity: '',
      loanMonths: '',
      annualInterest: '',
    };
  
    let isValid = true;
  
    if (!formData.mortgagePurpose) {
      newErrors.mortgagePurpose = 'יש לבחור מטרה למשכנתא';
      isValid = false;
    }
  
    if (!formData.age || isNaN(Number(formData.age)) || Number(formData.age) <= 0) {
      newErrors.age = 'יש להזין גיל תקין';
      isValid = false;
    }
  
    if (!formData.monthlyIncome || isNaN(Number(formData.monthlyIncome)) || Number(formData.monthlyIncome) <= 0) {
      newErrors.monthlyIncome = 'יש להזין הכנסה חודשית תקינה';
      isValid = false;
    }
  
    if (!formData.equity || isNaN(Number(formData.equity)) || Number(formData.equity) < 0) {
      newErrors.equity = 'יש להזין הון עצמי תקין';
      isValid = false;
    }
  
    if (!formData.loanMonths || isNaN(Number(formData.loanMonths)) || Number(formData.loanMonths) <= 0) {
      newErrors.loanMonths = 'יש להזין תקופת הלוואה בחודשים';
      isValid = false;
    }
  
    if (!formData.annualInterest || isNaN(Number(formData.annualInterest)) || Number(formData.annualInterest) <= 0) {
      newErrors.annualInterest = 'יש להזין ריבית שנתית תקינה';
      isValid = false;
    }
  
    setErrors(newErrors);
    setIsFormValid(isValid);
    return isValid;
  };
  
  useEffect(() => {
    validateForm();
  }, [formData]);
  
    
  
  
  
    const handleChangeWithCommas = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const formatted = formatWithCommas(value);
    const numeric = extractNumeric(formatted);

    setDisplayData(prev => ({ ...prev, [name]: formatted }));
    setFormData(prev => ({ ...prev, [name]: numeric }));
  };
  
  
  
  
  
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      console.log("Validation failed");
      return;
    }
    setIsModalOpen(true);
    // המשך טיפול בטופס...
    console.log("Form is valid!", formData);
  };
  






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
    <div className="min-h-screen bg-galbg py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-8">
          <h2 className="text-2xl font-bold text-main mb-6 text-center">סימולטור כמה משכנתא אוכל לקבל? </h2>
          <form onSubmit={handleSubmit} className="space-y-6">

            

            {/* שורה 2: מטרת המשכנתא */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ">
              <div>
                <label htmlFor="mortgagePurpose" className="block text-main font-semibold mb-2">מטרת המשכנתא</label>
                <select
                  name="mortgagePurpose"
                  id="mortgagePurpose"
                  value={formData.mortgagePurpose}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-main focus:bg-orange-100 text-gray-700"
                >
                  <option value="">בחר...</option>
                  <option value="single">דירה יחידה</option>
                  <option value="replacement">דירה חליפית (במקום דירה קיימת)</option>
                  <option value="additional">דירה נוספת</option>
                </select>
              </div>
                      
            </div>        
           {errors.mortgagePurpose && (<p className="text-red-500 text-sm mt-0 w-full">{errors.mortgagePurpose}</p>)}

            {/* שורה 3: זוגיות */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-main font-semibold mb-2">האם יש בן/בת זוג או שותף?</p>
                <div className="flex items-center gap-6">
                  {['yes', 'no'].map(val => (
                    <label key={val} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="hasPartner"
                        value={val}
                        checked={formData.hasPartner === val}
                        onChange={handleChange}
                        className="focus:ring-main"
                      />
                      <span className="text-main">{val === 'yes' ? 'כן' : 'לא'}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* שורה 4: גיל */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="age" className="block text-main font-semibold mb-2">גיל</label>
                <input
                  type="number"
                  name="age"
                  id="age"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="גיל"
                  className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-main focus:bg-orange-100 text-gray-700"
                  required
                />
              </div>
             
              {formData.hasPartner === 'yes' && (
                <div>
                  <label htmlFor="spouseAge" className="block text-main font-semibold mb-2">גיל בן/בת זוג</label>
                  <input
                    type="number"
                    name="spouseAge"
                    id="spouseAge"
                    value={formData.spouseAge}
                    onChange={handleChange}
                    placeholder="גיל"
                    className=" [appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-main focus:bg-orange-100 text-gray-700"
                  />
                </div>
              )}
            </div>
            {errors.age && (<p className="text-red-500 text-sm mt-1 w-full">{errors.age}</p>)}







            {/* שורה 5: הכנסות חודשיות */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="monthlyIncome" className="block text-main font-semibold mb-2">הכנסה חודשית נטו</label>
                <input
                  type="text"
                  name="monthlyIncome"
                  id="monthlyIncome"
                  value={displayData.monthlyIncome}
                  onChange={handleChangeWithCommas}
                  placeholder="₪"
                  className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-main focus:bg-orange-100 text-gray-700"
                  required
                />
              </div>
              {formData.hasPartner === 'yes' && (
                <div>
                  <label htmlFor="spouseMonthlyIncome" className="block text-main font-semibold mb-2">בן/בת זוג </label>
                  <input
                    type="text"
                    name="spouseMonthlyIncome"
                    id="spouseMonthlyIncome"
                    value={displayData.spouseMonthlyIncome}
                    onChange={handleChangeWithCommas}
                    placeholder="₪"
                    className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-main focus:bg-orange-100 text-gray-700"
                  />
                </div>
              )}
            </div>
            {errors.monthlyIncome && (<p className="text-red-500 text-sm mt-1 w-full">{errors.monthlyIncome}</p>)}



            {/* שורה 6: הכנסות נוספות */}       
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <div className="flex flex-col justify-between">
                <label htmlFor="additionalIncome" className="block text-main font-semibold mb-2">
                  הכנסות נוספות (₪)
                </label>
                <p className="text-xs text-main mb-1">(הכנסה חודשית כמו שכירות שמתקבלת קצבה קבועה וכיו"ב)</p>
                <input
                  type="text"
                  name="additionalIncome"
                  id="additionalIncome"
                  value={displayData.additionalIncome}
                  onChange={handleChangeWithCommas}
                  placeholder="₪"
                  className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-main focus:bg-orange-100 text-gray-700"
                />
              </div>

              {formData.hasPartner === 'yes' && (
                <div className="flex flex-col justify-between">
                  <label htmlFor="spouseAdditionalIncome" className="block text-main font-semibold mb-2">
                    הכנסות נוספות בן זוג
                  </label>
                  <p className="text-xs text-main mb-1">(הכנסה חודשית כמו שכירות שמתקבלת קצבה קבועה וכיו"ב)</p>
                  <input
                    type="text"
                    name="spouseAdditionalIncome"
                    id="spouseAdditionalIncome"
                    value={displayData.spouseAdditionalIncome}
                    onChange={handleChangeWithCommas}
                    placeholder="₪"
                    className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-main focus:bg-orange-100 text-gray-700"
                  />
                </div>
              )}
            </div>

            {/* שורה 7: הלוואות מעל 18 חודשים */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <div className="flex flex-col justify-between">
                <label htmlFor="hasLongLoans" className="block text-main font-semibold mb-2">
                  הלוואות מעל 18 חודשים
                </label>
                <p className="text-xs text-main mb-1">(סכום חודשי שמשולם להלוואות עד 18 חודשים)</p>
                <input
                  type="text"
                  name="hasLongLoans"
                  id="hasLongLoans"
                  value={displayData.hasLongLoans}
                  onChange={handleChangeWithCommas}
                  placeholder="סכום חודשי"
                  className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-main focus:bg-orange-100 text-gray-700"
                />
              </div>

              {formData.hasPartner === 'yes' && (
                <div className="flex flex-col justify-between">
                  <label htmlFor="spouseHasLongLoans" className="block text-main font-semibold mb-2">
                    בן/בת זוג
                  </label>
                  <p className="text-xs text-main mb-1">(סכום חודשי שמשולם להלוואות עד 18 חודשים)</p>
                  <input
                    type="text"
                    name="spouseHasLongLoans"
                    id="spouseHasLongLoans"
                    value={displayData.spouseHasLongLoans}
                    onChange={handleChangeWithCommas}
                    placeholder="סכום חודשי"
                    className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-main focus:bg-orange-100 text-gray-700"
                  />
                </div>
              )}
            </div>


            {/* שורה 8: הון עצמי */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="equity" className="block text-main font-semibold mb-2">הון עצמי (₪)</label>
                <input
                  type="text"
                  name="equity"
                  id="equity"
                  value={displayData.equity}
                  onChange={handleChangeWithCommas}
                  placeholder="₪הון עצמי"
                  className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-main focus:bg-orange-100 text-gray-700"
                  required
                />
              </div>           
            </div>
            {errors.equity && (<p className="text-red-500 text-sm mt-1 w-full">{errors.equity}</p>)}

            {/* שורה 9: מספר חודשים  */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label htmlFor="loanMonths" className="block text-main font-semibold mb-2">מספר חודשי הלוואה</label>
                <input
                type="number"
                name="loanMonths"
                id="loanMonths"
                value={formData.loanMonths}
                onChange={handleChange}            
                required
                className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-main focus:bg-orange-100 text-gray-700"
                />
            </div>
            </div>
            {errors.loanMonths && (<p className="text-red-500 text-sm mt-1 w-full">{errors.loanMonths}</p>)}


           {/* שורה 10: ריבית   */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="annualInterest" className="block text-main font-semibold mb-2">ריבית שנתית</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  name="annualInterest"
                  id="annualInterest"
                  value={formData.annualInterest}
                  onChange={handleChange}
                  placeholder="לדוג׳ 3.75"
                  required
                  className="[appearance:textfield] w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-main focus:bg-orange-100 text-gray-700"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">%</span>
              </div>
            </div>
            </div>   
            {errors.annualInterest && (<p className="text-red-500 text-sm mt-1 w-full">{errors.annualInterest}</p>)}


            {/* כפתור */}
            <div className="text-center">
              <button
                onClick={() => {
                  if (validateForm()) setIsModalOpen(true);
                }}
                type="button"
                disabled={!isFormValid}
                className={`${
                  isFormValid
                    ? "bg-main hover:bg-[#13577c]"
                    : "bg-gray-400 cursor-not-allowed"
                } text-white font-bold py-2 px-4 rounded transition`}
              >
                הצג תוצאות
              </button>
            </div>

            
            {/* ResultsModal */}
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
