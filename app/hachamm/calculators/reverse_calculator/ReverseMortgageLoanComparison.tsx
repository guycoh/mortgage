"use client";

import { useMemo, useState } from "react";
import ReverseMortgageAmortizationModal from "./ReverseMortgageAmortizationModal";
import ReverseMortgageAmortizationTable from "./ReverseMortgageAmortizationTable";

type Props = {
  maxLoan: number;
  interestRate?: number;
  indexRate?: number;
  months?: number;
};

export default function ReverseMortgageLoanComparison({
  maxLoan,
  interestRate = 0,
  indexRate = 0,
  months = 360
}: Props) {

  const [loanAmount, setLoanAmount] = useState(maxLoan);
  const [openTable, setOpenTable] = useState<"balloon" | "grace" | null>(null);

  const calc = useMemo(() => {
    const loan = Number(loanAmount) || 0;
    const yearlyInterest = interestRate / 100;
    const yearlyIndex = indexRate / 100;

    // חישוב שיעורים חודשיים מדויקים (ריבית אפקטיבית חודשית)
    const monthlyInterest = Math.pow(1 + yearlyInterest, 1 / 12) - 1;
    const monthlyIndex = Math.pow(1 + yearlyIndex, 1 / 12) - 1;

    /*
    =====================================================
    1. בלון מלא (הכל נדחה לסוף - קרן, ריבית ומדד)
    =====================================================
    */
    let balloonBalance = loan;
    let balloonInterest = 0;
    let balloonIndex = 0;

    for (let i = 0; i < months; i++) {
      // הריבית מתווספת לחוב (ריבית דריבית)
      const interest = balloonBalance * monthlyInterest;
      balloonInterest += interest;
      balloonBalance += interest;

      // המדד מייקר את כל יתרת החוב העדכנית
      const index = balloonBalance * monthlyIndex;
      balloonIndex += index;
      balloonBalance += index;
    }

    /*
    =====================================================
    2. גרייס / בלון חלקי (הריבית משולמת מדי חודש, הקרן והמדד נדחים)
    =====================================================
    */
    let graceBalance = loan; // יתרת הקרן בלבד
    let totalInterestPaid = 0;
    let totalIndexAccrued = 0;
    
    // החזר חודשי ראשוני (לפני שהמדד הספיק להשפיע)
    const firstMonthGracePayment = loan * monthlyInterest;

    for (let i = 0; i < months; i++) {
      // הלווה משלם את הריבית החודשית מתוך הקרן המוצמדת הנוכחית
      const interestPayment = graceBalance * monthlyInterest;
      totalInterestPaid += interestPayment;

      // הקרן עצמה שלא משולמת, מתעדכנת ועולה לפי המדד של אותו חודש
      const indexAccrued = graceBalance * monthlyIndex;
      totalIndexAccrued += indexAccrued;
      graceBalance += indexAccrued;
    }

    return {
      balloon: {
        monthly: 0,
        total: balloonBalance,
        interest: balloonInterest,
        index: balloonIndex,
        cost: balloonInterest + balloonIndex
      },
      grace: {
        monthly: firstMonthGracePayment,
        total: graceBalance + totalInterestPaid, // סך הכל תשלומים שבוצעו + יתרת פירעון הקרן המוצמדת בסוף
        interest: totalInterestPaid,
        index: totalIndexAccrued,
        cost: totalInterestPaid + totalIndexAccrued
      }
    };
  }, [loanAmount, interestRate, indexRate, months]);

  return (
    <div className="w-full bg-white rounded-xl shadow-inner p-5 text-gray-900 space-y-5">
      <ReverseMortgageAmortizationModal
        open={openTable === "balloon"}
        onClose={() => setOpenTable(null)}
        title="לוח סילוקין בלון מלא"
      >
        <ReverseMortgageAmortizationTable
          loan={loanAmount}
          interestRate={Number(interestRate) || 0}
          indexRate={Number(indexRate) || 0}
          months={Number(months) || 360}
          type="balloon"
        />
      </ReverseMortgageAmortizationModal>

      <ReverseMortgageAmortizationModal
        open={openTable === "grace"}
        onClose={() => setOpenTable(null)}
        title="לוח סילוקין גרייס"
      >
        <ReverseMortgageAmortizationTable
          loan={loanAmount}
          interestRate={Number(interestRate) || 0}
          indexRate={Number(indexRate) || 0}
          months={Number(months) || 360}
          type="grace"
        />
      </ReverseMortgageAmortizationModal>

      <div>
        <label className="font-bold">סכום משכנתא מבוקשת</label>
        <input
          type="number"
          className="w-full mt-2 rounded-md p-3 border focus:ring-2 focus:ring-orange-300"
          value={loanAmount}
          max={maxLoan}
          onChange={e => setLoanAmount(Math.min(Number(e.target.value) || 0, maxLoan))}
        />
        <div className="text-sm text-gray-500 mt-1">
          מקסימום: ₪{maxLoan.toLocaleString()}
        </div>
      </div>

      <ResultCard
        title="הלוואת בלון מלא"
        data={calc.balloon}
        onOpen={() => setOpenTable("balloon")}
        tableTitle="לוח סילוקין בלון מלא"
      />

      <ResultCard
        title="הלוואת גרייס"
        data={calc.grace}
        onOpen={() => setOpenTable("grace")}
        tableTitle="לוח סילוקין גרייס"
        isGrace={true}
      />
    </div>
  );
}

function ResultCard({ title, data, onOpen, tableTitle, isGrace = false }: any) {
  return (
    <div className="rounded-xl bg-gray-100 p-4 space-y-2">
      <h3 className="font-bold text-lg text-blue-900">{title}</h3>

      <Row
        label={isGrace ? "החזר חודשי התחלתי" : "החזר חודשי שוטף"}
        value={data.monthly}
      />
      <Row
        label={isGrace ? "סך תשלומים + יתרת סיום" : "החזר כולל בתום תקופה"}
        value={data.total}
      />
      <Row
        label="סה״כ ריבית"
        value={data.interest}
      />
      <Row
        label="סה״כ מדד"
        value={data.index}
      />

      <div className="border-t pt-2 font-bold">
        עלות כוללת ריבית + מדד:
        <div className="mt-1">
          ₪{Math.round(data.cost).toLocaleString()}
        </div>
      </div>

      <div className="flex justify-center mt-3">
        <button
          onClick={onOpen}
          className="px-6 py-2 rounded-xl bg-[#1d75a1] text-white font-bold shadow-md hover:bg-blue-800 transition"
        >
          {tableTitle}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: any) {
  return (
    <div className="flex justify-between text-sm">
      <span>{label}</span>
      <b>₪{Math.round(value).toLocaleString()}</b>
    </div>
  );
}







// "use client";

// import { useMemo, useState } from "react";
// import ReverseMortgageAmortizationModal from "./ReverseMortgageAmortizationModal";
// import ReverseMortgageAmortizationTable from "./ReverseMortgageAmortizationTable";

// type Props = {
//   maxLoan: number;
//   interestRate?: number;
//   indexRate?: number;
//   months?: number;
// };



// export default function ReverseMortgageLoanComparison({

// maxLoan,
// interestRate = 0,
// indexRate = 0,
// months = 360

// }:Props){



// const [loanAmount,setLoanAmount] =
// useState(maxLoan);

// const [openTable, setOpenTable] =
// useState<"balloon" | "grace" | null>(null);

// const calc = useMemo(()=>{


// const loan = Number(loanAmount) || 0;


// const yearlyInterest =
// interestRate / 100;


// const yearlyIndex =
// indexRate / 100;



// const monthlyInterest =
// Math.pow(
// 1 + yearlyInterest,
// 1/12
// )-1;



// const monthlyIndex =
// Math.pow(
// 1 + yearlyIndex,
// 1/12
// )-1;



// /*
// ====================
// בלון מלא
// קרן + ריבית + מדד נדחים
// ====================
// */


// let balloonBalance = loan;


// let balloonInterest = 0;
// let balloonIndex = 0;



// for(let i=0;i<months;i++){


// const beforeIndex =
// balloonBalance;


// const interest =
// beforeIndex *
// monthlyInterest;



// balloonBalance += interest;


// balloonInterest += interest;



// const index =
// balloonBalance *
// monthlyIndex;



// balloonBalance += index;


// balloonIndex += index;


// }



// const balloonCost =
// balloonInterest +
// balloonIndex;


// /*
// ====================
// גרייס
// ריבית בלבד
// ====================
// */


// let graceBalance = loan;


// let totalInterest = 0;
// let totalIndex = 0;



// for(let i=0;i<months;i++){


// const interest =
// graceBalance *
// monthlyInterest;



// totalInterest += interest;



// const index =
// graceBalance *
// monthlyIndex;



// totalIndex += index;



// graceBalance += index;


// }



// const graceMonthly =
// loan *
// monthlyInterest;



// return {


// balloon:{

// monthly:0,

// total:
// balloonBalance,

// interest:
// balloonInterest,

// index:
// balloonIndex,

// cost:
// balloonCost

// },



// grace:{

// monthly:
// graceMonthly,

// total:
// graceBalance,

// interest:
// totalInterest,

// index:
// totalIndex,

// cost:
// totalInterest + totalIndex

// }


// }



// },[
// loanAmount,
// interestRate,
// indexRate,
// months
// ]);




// return (


// <div className="
// w-full
// bg-white
// rounded-xl
// shadow-inner
// p-5
// text-gray-900
// space-y-5
// ">
// <ReverseMortgageAmortizationModal
//   open={openTable === "balloon"}
//   onClose={() => setOpenTable(null)}
//   title="לוח סילוקין בלון מלא"
// >
//   <ReverseMortgageAmortizationTable
//     loan={loanAmount}
//     interestRate={Number(interestRate) || 0}
//     indexRate={Number(indexRate) || 0}
//     months={Number(months) || 360}
//     type="balloon"
//   />
// </ReverseMortgageAmortizationModal>


// <ReverseMortgageAmortizationModal
//   open={openTable === "grace"}
//   onClose={() => setOpenTable(null)}
//   title="לוח סילוקין גרייס"
// >
//   <ReverseMortgageAmortizationTable
//     loan={loanAmount}
//     interestRate={Number(interestRate) || 0}
//     indexRate={Number(indexRate) || 0}
//     months={Number(months) || 360}
//     type="grace"
//   />
// </ReverseMortgageAmortizationModal>


// <div>


// <label className="font-bold">

// סכום משכנתא מבוקשת

// </label>


// <input

// type="number"

// className="
// w-full
// mt-2
// rounded-md
// p-3
// border
// focus:ring-2
// focus:ring-orange-300
// "

// value={loanAmount}

// max={maxLoan}

// onChange={
// e=>
// setLoanAmount(
// Math.min(
// Number(e.target.value) || 0  ,
// maxLoan
// )
// )
// }

// />



// <div className="
// text-sm
// text-gray-500
// mt-1
// ">

// מקסימום:
// ₪{maxLoan.toLocaleString()}

// </div>


// </div>


// <ResultCard
// title="הלוואת בלון מלא"
// data={calc.balloon}
// onOpen={()=>setOpenTable("balloon")}
// tableTitle="לוח סילוקין בלון מלא"
// />

// <ResultCard
// title="הלוואת גרייס"
// data={calc.grace}
// onOpen={()=>setOpenTable("grace")}
// tableTitle="לוח סילוקין גרייס"
// />





// </div>


// )

// }

// function ResultCard({ title, data, onOpen, tableTitle }: any) {


// return (

// <div className="
// rounded-xl
// bg-gray-100
// p-4
// space-y-2
// ">


// <h3 className="
// font-bold
// text-lg
// text-blue-900
// ">

// {title}

// </h3>



// <Row
// label="החזר חודשי התחלתי"
// value={data.monthly}
// />


// <Row
// label="החזר כולל בתום תקופה"
// value={data.total}
// />


// <Row
// label="סה״כ ריבית"
// value={data.interest}
// />


// <Row
// label="סה״כ מדד"
// value={data.index}
// />



// <div className="
// border-t
// pt-2
// font-bold
// ">

// עלות כוללת ריבית + מדד:

// <div className="mt-1">
// ₪{Math.round(data.cost).toLocaleString()}
// </div>

// </div>



// <div className="flex justify-center mt-3">

// <button

// onClick={onOpen}

// className="
// px-6
// py-2
// rounded-xl
// bg-blue-900
// text-white
// font-bold
// shadow-md
// hover:bg-blue-800
// transition
// "

// >

// {tableTitle}

// </button>


// </div>



// </div>


// )

// }







// function Row({
// label,
// value
// }:any){

// return (

// <div className="
// flex
// justify-between
// text-sm
// ">

// <span>
// {label}
// </span>


// <b>
// ₪{Math.round(value).toLocaleString()}
// </b>


// </div>

// )

// }