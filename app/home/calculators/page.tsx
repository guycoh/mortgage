"use client";

import Link from "next/link";
import Calculator1 from "public/assets/images/svg/Calculator1";
import Calculator2 from "public/assets/images/svg/Calculator2";
import Calculator3 from "public/assets/images/svg/Calculator3";
import Calculator4 from "public/assets/images/svg/Calculator4";
import Calculator5 from "public/assets/images/svg/Calculator5";
import Calculator6 from "@/public/assets/images/svg/Calculator6";
import Calculator7 from "@/public/assets/images/svg/Calculator7";
import Calculator8 from "@/public/assets/images/svg/Calculator8";
import BaloonIcon from "@/public/assets/images/svg/calculators/baloon";

const calculators = [
  { title: "מחשבון פשוט", description: "חשב את ההחזר החודשי", link: "/home/calculators/simple_calculator", icon: Calculator2 },
  { title: "מחשבון יכולות", description: "", link: "/home/calculators/mortgage_capability", icon: Calculator3 },
  { title: "מחשבון מס רכישה", description: "בדוק כמה מס רכישה תצטרך לשלם.", link: "/home/calculators/purchase_tax_calculator", icon: Calculator4 },
  { title: "מחשבון מחיר למשתכן", description: "חשב את ההוצאות והתנאים לזכאות.", link: "/home/calculators/mechir_la_mishtaken", icon: Calculator7 },
  { title: "מחשבון עלויות נלוות", description: "בדוק מה העלויות הנלוות", link: "/home/calculators/costs_calculator", icon: Calculator8 },
  { title: "מחשבון קרן שווה", description: "קרן שווה", link: "/home/calculators/equal_principal", icon: Calculator8 },
  { title: "מחשבון הלוואת בלון", description: "בלון", link: "/home/calculators/baloon", icon: BaloonIcon },
  { title: "מחשבון כדאיות מחזור", description: "בדוק האם משתלם לך למחזר את המשכנתא.", link: "/home/calculators/refinance-calculator", icon: Calculator1 },
];

function CalculatorCube({ title, description, icon: Icon, link }: any) {
  const size = 200; // רוחב הפאה הקדמית
  const height = 220; // גובה הפאה הקדמית
  const depth = 15; // עומק מצומצם לנייד
  const cubeColor = "#1d75a1";

  return (
    <Link href={link}>
      <div
        className="relative cursor-pointer hover:scale-[1.05] transition-all duration-300"
        style={{ width: size + depth, height: height + depth }}
      >
        {/* פאה קדמית */}
        <div
          className="absolute flex flex-col items-center justify-start pt-6 text-white text-center shadow-lg rounded-none"
          style={{
            width: size,
            height: height,
            top: depth,
            left: 0,
            zIndex: 3,
            background: cubeColor,
            boxShadow: "0 20px 30px rgba(0,0,0,0.3), inset 0 2px 8px rgba(255,255,255,0.15)",
          }}
        >
          <div className="mb-3">
            <Icon size={50} color="white" className="drop-shadow-md" />
          </div>
          <h3 className="text-lg font-bold mb-1">{title}</h3>
          {description && (
            <p className="text-sm opacity-90 break-words whitespace-normal px-2 text-center">
              {description}
            </p>
          )}

        </div>

        {/* פאה ימנית */}
        <div
          className="absolute"
          style={{
            width: depth,
            height: height,
            top: depth,
            left: size,
            background: cubeColor,
            border: "1px solid #15516f",
            transform: "skewY(-45deg)",
            transformOrigin: "top left",
            zIndex: 2,
          }}
        />

        {/* פאה עליונה */}
        <div
          className="absolute"
          style={{
            width: size,
            height: depth,
            top: 0,
            left: 0,
            background: cubeColor,
            border: "1px solid #15516f",
            transform: "skewX(-45deg)",
            transformOrigin: "bottom left",
            zIndex: 1,
          }}
        />
      </div>
    </Link>
  );
}


export default function Calculators3DGrid() {
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-6">
      <h1 className="text-center text-gray-600 text-3xl font-bold mb-10 tracking-wide drop-shadow-lg">
        מחשבוני משכנתא 
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-12 justify-items-center">
        {calculators.slice(0, 8).map((calc, i) => (
          <CalculatorCube key={i} {...calc} />
        ))}
      </div>
    </div>
  );
}





















// 'use client';

// import Calculator1 from "public/assets/images/svg/Calculator1";
// import Calculator2 from "public/assets/images/svg/Calculator2";
// import Calculator3 from "public/assets/images/svg/Calculator3";
// import Calculator4 from "public/assets/images/svg/Calculator4";
// import Calculator5 from "public/assets/images/svg/Calculator5";
// import Calculator6 from "@/public/assets/images/svg/Calculator6";
// import Calculator7 from "@/public/assets/images/svg/Calculator7";
// import Calculator8 from "@/public/assets/images/svg/Calculator8";
// import BaloonIcon from "@/public/assets/images/svg/calculators/baloon";

// import Link from 'next/link';


// const calculators = [
//   { title: "מחשבון פשוט", description: "חשב את ההחזר החודשי", link: "/home/calculators/simple_calculator", icon: Calculator2 },
//   { title: "מחשבון יכולות", description: "", link: "/home/calculators/mortgage_capability", icon: Calculator3 },
//   { title: "מחשבון מס רכישה", description: "בדוק כמה מס רכישה תצטרך לשלם.", link: "/home/calculators/purchase_tax_calculator", icon: Calculator4 },
//   { title: "מחשבון מחיר למשתכן", description: "חשב את ההוצאות והתנאים לזכאות.", link: "/home/calculators/mechir_la_mishtaken", icon: Calculator7 },
//   { title: "מחשבון עלויות נלוות", description: "בדוק מה העלויות הנלוות", link: "/home/calculators/costs_calculator", icon: Calculator8 },
//   { title: "מחשבון קרן שווה", description: "קרן שווה ", link: "/home/calculators/equal_principal", icon: Calculator8 },
//   { title: "מחשבון הלוואת בלון", description: "בלון ", link: "/home/calculators/baloon", icon: BaloonIcon },
//   { title: "מחשבון כדאיות מחזור", description: "בדוק האם משתלם לך למחזר את המשכנתא.", link: "/home/calculators/refinance-calculator", icon: Calculator1 },  
//   { title: "מחשבון זכאות", description: "חשב זכאות משרד השיכון", link: "/home/calculators/eligibility_calculator", icon: Calculator5 },
//   { title: "מחשבון משכנתא", description: "חשב את ההחזר החודשי שלך.", link: "/home/calculators/mortgage_calculator", icon: Calculator6},
 
// ];

// export default function CalculatorsPage() {
//   return (

// <div className="min-h-screen bg-white py-10 px-4 sm:px-8 md:px-16 lg:px-24 xl:px-32 2xl:px-40">
//   <h1 className="text-center text-gray-900 text-3xl font-bold mb-10 tracking-wide drop-shadow-lg">
//     מחשבוני משכנתא 
//   </h1>
//   <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
//     {calculators.map((calc, index) => {
//       const Icon = calc.icon;
//       return (
//         <Link href={calc.link} key={index}>
//           <div className="bg-white backdrop-blur-md p-6 rounded-3xl border border-main hover:border-main transition-all duration-300 cursor-pointer flex flex-col items-center text-center h-60 hover:scale-[1.04] hover:shadow-main/30 hover:shadow-2xl group">
//             <div className="bg-[#1d75a1]/10 rounded-full p-4 mb-4 shadow-md group-hover:rotate-[8deg] transition-transform duration-300">
//               <Icon size={42} color="#1d75a1" className="w-12 h-12 drop-shadow-md" />
//             </div>
//             <h2 className="text-xl font-semibold text-gray-800 mb-2 tracking-wide drop-shadow-sm">
//               {calc.title}
//             </h2>
//           </div>
//         </Link>
//       );
//     })}
//   </div>
// </div>

        


//   );
// }



