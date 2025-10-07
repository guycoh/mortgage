"use client"

import Link from "next/link";

import IconGeneralMortgage from "@/public/assets/images/svg/motrgageType/generalMortgage";
import HomeIcon from "@/public/assets/images/svg/motrgageType/homeIcon";
import LoanIcon from "@/public/assets/images/svg/motrgageType/loanIcon";
import ReverseIcon from "@/public/assets/images/svg/motrgageType/ReverseIcon";
import ConsolidationIcon from "@/public/assets/images/svg/motrgageType/ConsolidationIcon";
import EligibleIcon from "@/public/assets/images/svg/motrgageType/EligibleIcon";
import RefinancingIcon from "@/public/assets/images/svg/motrgageType/RefinancingIcon";
import InsuranceIcon from "@/public/assets/images/svg/motrgageType/InsuranceIcon";
import RefusedIcon from "@/public/assets/images/svg/motrgageType/RefusedIcon";
import BridgeIcon from "@/public/assets/images/svg/motrgageType/BridgeIcon";

const mortgageCategories = [
  { category: "משכנתא לדיור", link: "mortgage_for_housing", icon: <HomeIcon size={64} color="#1d75a1" /> },
  { category: "הלוואה לכל מטרה", link: "mortgage_for_any_purpose", icon: <LoanIcon size={64} color="#1d75a1" /> },
  { category: "משכנתא הפוכה", link: "reverse_mortgage", icon: <ReverseIcon size={64} color="#1d75a1" /> },
  { category: "איחוד הלוואות", link: "loan_consolidation", icon: <ConsolidationIcon size={64} color="#1d75a1" /> },
  { category: "משכנתא חוץ בנקאית", link: "mortgage_non_bank", icon: <IconGeneralMortgage size={64} color="#1d75a1" /> },
  { category: "מחיר למשתכן", link: "home_for_eligible_buyers", icon: <EligibleIcon size={64} color="#1d75a1" /> },
  { category: "מיחזור משכנתא", link: "mortgage_refinancing", icon: <RefinancingIcon size={64} color="#1d75a1" /> },
  { category: "הלוואת גישור", link: "bridge_loan", icon: <BridgeIcon size={64} color="#1d75a1" /> },
  { category: "ביטוח משכנתא", link: "mortgage_insurance", icon: <InsuranceIcon size={64} color="#1d75a1" /> },
  { category: "מסורבי בנקים", link: "mortgage_for_refused_clients", icon: <RefusedIcon size={64} color="#1d75a1" /> },
];

export default function MortgageGrid() {
  return (
    <section aria-label="תפריט נושאים" className="w-full max-w-6xl mx-auto px-4 py-12">
      <h2 className="text-2xl md:text-3xl font-bold text-[#0f4f66] mb-6">תחומי משכנתא</h2>
        <h1 className="text-2xl font-bold mb-4 text-center text-fontss1">
        איזה משכנתא מתאימה לי? &nbsp;
        <Link
          href={`/muhni/guide`}
          className="text-blue-400 underline hover:text-blue-600 transition-colors"
        >
          למדריך המשכנתא
        </Link>
       </h1>
      <div
        className="
          grid 
          grid-cols-2 
          md:grid-cols-3 
          lg:grid-cols-4 
          gap-6
        "
      >
        {mortgageCategories.map((item) => (
          <Link
            key={item.link}
            href={`/home/${item.link}`}
            className="group"
            aria-label={item.category}
          >
            <article
              className="
                w-full h-full
                bg-white/90
                rounded-2xl
                border border-slate-100
                shadow-[0_8px_30px_rgba(2,6,23,0.06)]
                p-6
                flex flex-col items-center justify-center
                text-center
                transition-[transform,box-shadow] duration-300
                hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(13,30,49,0.12)]
                focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#cbeefb]/50
              "
              role="button"
            >
              <div className="w-16 h-16 flex items-center justify-center mb-3">
                {item.icon}
              </div>

              <h3 className="text-sm md:text-base font-semibold text-[#0f1724]">
                {item.category}
              </h3>

              <p className="mt-2 text-xs text-slate-500 hidden md:block">
                לחצו לפרטים והסברים שימושיים — חישובים, דוגמאות ומדריכים קצרים.
              </p>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}



// "use client";

// import { useState } from "react";
// import Link from "next/link";

// import IconGeneralMortgage from "@/public/assets/images/svg/motrgageType/generalMortgage";
// import HomeIcon from "@/public/assets/images/svg/motrgageType/homeIcon";
// import LoanIcon from "@/public/assets/images/svg/motrgageType/loanIcon";
// import ReverseIcon from "@/public/assets/images/svg/motrgageType/ReverseIcon";
// import ConsolidationIcon from "@/public/assets/images/svg/motrgageType/ConsolidationIcon";
// import EligibleIcon from "@/public/assets/images/svg/motrgageType/EligibleIcon";
// import RefinancingIcon from  "@/public/assets/images/svg/motrgageType/RefinancingIcon";
// import InsuranceIcon from  "@/public/assets/images/svg/motrgageType/InsuranceIcon";
// import RefusedIcon from  "@/public/assets/images/svg/motrgageType/RefusedIcon";
// import BridgeIcon from "@/public/assets/images/svg/motrgageType/BridgeIcon";

// const mortgageCategories = [
//   { category: "משכנתא לדיור", link: "mortgage_for_housing", icon: <HomeIcon size={100} color="#1d75a1"/> },
//   { category: "הלוואה לכל מטרה", link: "mortgage_for_any_purpose", icon: <LoanIcon size={100} color="#1d75a1"  /> },
//   { category: "משכנתא הפוכה", link: "reverse_mortgage", icon: <ReverseIcon size={100} color="#1d75a1" /> },  
//   { category: "איחוד הלוואות", link: "loan_consolidation", icon: <ConsolidationIcon size={100} color="#1d75a1"/> },
//   { category: "משכנתא חוץ בנקאית", link: "mortgage_non_bank", icon: <IconGeneralMortgage size={100} color="#1d75a1"/> },
//   { category: "מחיר למשתכן", link: "home_for_eligible_buyers", icon: <EligibleIcon size={100} color="#1d75a1"/> },
//   { category: "מיחזור משכנתא", link: "mortgage_refinancing", icon: <RefinancingIcon size={100} color="#1d75a1"/> },
//   { category: "הלוואת גישור", link: "bridge_loan", icon: <BridgeIcon size={100} color="#1d75a1"/> },
//   { category: "ביטוח משכנתא", link: "mortgage_insurance", icon: <InsuranceIcon size={100} color="#1d75a1"/> },
//   { category: "מסורבי בנקים", link: "mortgage_for_refused_clients", icon: <RefusedIcon size={100} color="#1d75a1"/> },
// ];


// export default function FullCircleSlider() {
//   const [rotation, setRotation] = useState(0);
//   const total = mortgageCategories.length;
//   const radius = 300;

//   const angleStep = 360 / total;

//   const rotateNext = () => setRotation((r) => r - angleStep);
//   const rotatePrev = () => setRotation((r) => r + angleStep);

//   return (
//     <div className="relative w-full h-[500px] flex items-center justify-center bg-gradient-to-b from-[#0b2f42] via-[#0e4e68] to-[#051c29] overflow-hidden perspective-[1500px]">
//       <div
//         className="relative w-full h-full transform-style-preserve-3d transition-transform duration-700"
//         style={{ transform: `rotateY(${rotation}deg)` }}
//       >
//         {mortgageCategories.map((cat, index) => {
//           const angle = index * angleStep;
//           const transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
//           return (
//             <Link
//               href={`/home/${cat.link}`}
//               key={index}
//               className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
//               style={{ transform }}
//             >
//               <div
//                 className="w-[180px] h-[220px] rounded-2xl shadow-lg flex items-center justify-center text-center cursor-pointer transition-transform duration-300 hover:scale-105 hover:shadow-2xl"
//                 style={{ backgroundColor: cat.color }}
//               >
//                 <span className="text-white font-bold">{cat.category}</span>
//               </div>
//             </Link>
//           );
//         })}
//       </div>

//       {/* חיצים */}
//       <button
//         onClick={rotatePrev}
//         className="absolute left-5 text-white text-4xl hover:text-cyan-200 transition z-20"
//       >
//         ‹
//       </button>
//       <button
//         onClick={rotateNext}
//         className="absolute right-5 text-white text-4xl hover:text-cyan-200 transition z-20"
//       >
//         ›
//       </button>
//     </div>
//   );
// }
