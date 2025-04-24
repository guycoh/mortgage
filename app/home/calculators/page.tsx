'use client';

import Calculator1 from "public/assets/images/svg/Calculator1";
import Calculator2 from "public/assets/images/svg/Calculator2";
import Calculator3 from "public/assets/images/svg/Calculator3";
import Calculator4 from "public/assets/images/svg/Calculator4";
import Calculator5 from "public/assets/images/svg/Calculator5";
import Link from 'next/link';


const calculators = [
  { title: "מחשבון כדאיות מחזור", description: "בדוק האם משתלם לך למחזר את המשכנתא.", link: "/home/calculators/refinance-calculator", icon: Calculator1 },
  { title: "מחשבון פשוט", description: "חשב את ההחזר החודשי", link: "/home/calculators/simple_calculator", icon: Calculator2 },
  { title: "?מחשבון כמה משכנתא אוכל לקבל", description:"", link: "/home/calculators/mortgage_capability", icon: Calculator3 }, 
  { title: "מחשבון מס רכישה", description: "בדוק כמה מס רכישה תצטרך לשלם.", link: "/home/calculators/purchase_tax_calculator", icon: Calculator4 },
  { title: "מחשבון זכאות", description: "חשב זכאות משרד השיכון", link: "/home/calculators/eligibility_calculator", icon: Calculator5 },
  { title: "מחשבון משכנתא", description: "חשב את ההחזר החודשי שלך.", link: "/home/calculators/refinance-calculator", icon: Calculator3},
  { title: "מחשבון מחיר למשתכן", description: "חשב את ההוצאות והתנאים לזכאות.", link: "/home/calculators/mechir_la_mishtaken", icon: Calculator3 },
];


{calculators.map((calc, index) => {
  const Icon = calc.icon;
  return (
    <Link href={calc.link} key={index}>
      <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col items-center text-center h-48 hover:bg-white/90 transform hover:scale-105">
        <Icon className="mb-4 w-12 h-12" />
        <h2 className="text-lg font-semibold mb-1">{calc.title}</h2>
        <p className="text-sm">{calc.description}</p>
      </div>
    </Link>
  );
})}


export default function CalculatorsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-6 text-[#1d75a1]">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-10">מחשבונים</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {calculators.map((calc, index) => {
            const Icon = calc.icon;
            return (
              <Link href={calc.link} key={index}>
                <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col items-center text-center h-48 hover:bg-white/90 transform hover:scale-105">
                  <Icon size={40} color="#1d75a1"   className="mb-4 w-12 h-12" />
                  <h2 className="text-lg font-semibold mb-1">{calc.title}</h2>
                  <p className="text-sm">{calc.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}




















// 'use client';

// import Image from 'next/image';
// import Link from 'next/link';

// const calculators = [
//   { title: "מחשבון כדאיות מחזור", description: "בדוק האם משתלם לך למחזר את המשכנתא.", link: "/home/calculators/refinance-calculator" },
  
//   { title: "מחשבון פשוט", description: "חשב את ההחזר החודשי", link: "/home/calculators/simple_calculator" },
//   { title: "?מחשבון כמה משכנתא אוכל לקבל", description:"", link: "/home/calculators/mortgage_capability" }, 
//   { title: "מחשבון מס רכישה", description: "בדוק כמה מס רכישה תצטרך לשלם.", link: "/home/calculators/purchase_tax_calculator" },
//   { title: "מחשבון זכאות", description: "חשב זכאות משרד השיכון", link: "/home/calculators/eligibility_calculator" },
//   { title: "מחשבון משכנתא", description: "חשב את ההחזר החודשי שלך.", link: "/home/calculators/refinance-calculator" },
  
//   { title: "מחשבון מחיר למשתכן", description: "חשב את ההוצאות והתנאים לזכאות.", link: "/home/calculators/mechir_la_mishtaken" },

  
// ];

// export default function CalculatorsPage() {
//   return (
//     <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-6 text-[#1d75a1]">
//       <div className="max-w-6xl mx-auto">
//         <h1 className="text-3xl font-bold text-center mb-10">מחשבונים</h1>
//         <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
//           {calculators.map((calc, index) => (
//             <Link href={calc.link} key={index}>
//               <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col items-center text-center h-48 hover:bg-white/90 transform hover:scale-105">
//                 <Image
//                   src="/assets/svgFiles/calculator.svg"
//                   alt="calculator"
//                   width={50}
//                   height={50}
//                   className="mb-4 invert-[34%] sepia-[58%] saturate-[582%] hue-rotate-[159deg] brightness-[91%] contrast-[93%]"
//                 />
//                 <h2 className="text-lg font-semibold mb-1">{calc.title}</h2>
//                 <p className="text-sm">{calc.description}</p>
//               </div>
//             </Link>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }
