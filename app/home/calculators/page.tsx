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

// function CalculatorCube({ title, description, icon: Icon, link }: any) {
//   const size = 200; // גודל רגיל (דסקטופ)
//   const height = 220;
//   const depth = 15;
//   const cubeColor = "#1d75a1";

//   return (
//     <Link href={link}>
//       <div
//         className="relative cursor-pointer hover:scale-[1.05] transition-all duration-300 
//                    w-[200px] h-[235px] sm:w-[220px] sm:h-[250px] 
//                    md:w-[240px] md:h-[260px]"
//         style={{ width: size + depth, height: height + depth }}
//       >
//         {/* פאה קדמית */}
//         <div
//           className="absolute flex flex-col items-center justify-start pt-6 text-white text-center shadow-lg rounded-none
//                      w-[200px] h-[220px] sm:w-[220px] sm:h-[235px] md:w-[240px] md:h-[250px]"
//           style={{
//             top: depth,
//             left: 0,
//             zIndex: 3,
//             background: cubeColor,
//             boxShadow: "0 20px 30px rgba(0,0,0,0.3), inset 0 2px 8px rgba(255,255,255,0.15)",
//           }}
//         >
//           <div className="mb-3 sm:mb-4">
//             <Icon
//               size={40} // קטן יותר לנייד
//               color="white"
//               className="drop-shadow-md sm:w-12 sm:h-12 w-10 h-10"
//             />
//           </div>
//           <h3 className="text-base sm:text-lg md:text-xl font-bold mb-1">{title}</h3>
//           {description && (
//             <p className="text-xs sm:text-sm md:text-base opacity-90 break-words whitespace-normal px-2 text-center leading-snug">
//               {description}
//             </p>
//           )}
//         </div>

//         {/* פאה ימנית */}
//         <div
//           className="absolute"
//           style={{
//             width: depth,
//             height: height,
//             top: depth,
//             left: size,
//             background: cubeColor,
//             border: "1px solid #15516f",
//             transform: "skewY(-45deg)",
//             transformOrigin: "top left",
//             zIndex: 2,
//           }}
//         />

//         {/* פאה עליונה */}
//         <div
//           className="absolute"
//           style={{
//             width: size,
//             height: depth,
//             top: 0,
//             left: 0,
//             background: cubeColor,
//             border: "1px solid #15516f",
//             transform: "skewX(-45deg)",
//             transformOrigin: "bottom left",
//             zIndex: 1,
//           }}
//         />
//       </div>
//     </Link>
//   );
// }


 function CalculatorCube({ title, description, icon: Icon, link }: any) {
  // הגדרות בסיסיות
  const baseSize = 200;
  const baseHeight = 220;
  const baseDepth = 15;
  const cubeColor = "#1d75a1";

  return (
    <Link href={link}>
      <div
        className="relative cursor-pointer hover:scale-[1.05] transition-all duration-300
                   mx-auto"
        style={{
          width: `clamp(140px, 35vw, ${baseSize + baseDepth}px)`,
          height: `clamp(160px, 40vw, ${baseHeight + baseDepth}px)`,
        }}
      >
        {/* פאה קדמית */}
        <div
          className="absolute flex flex-col items-center justify-start text-white text-center shadow-lg rounded-none
                     pt-[6%]"
          style={{
            width: `clamp(130px, 33vw, ${baseSize}px)`,
            height: `clamp(150px, 38vw, ${baseHeight}px)`,
            top: `clamp(6px, 1.2vw, ${baseDepth}px)`,
            left: 0,
            zIndex: 3,
            background: cubeColor,
            boxShadow: "0 18px 25px rgba(0,0,0,0.25), inset 0 2px 8px rgba(255,255,255,0.15)",
          }}
        >
          <div className="mb-2 sm:mb-3">
            <Icon
              size={40}
              color="white"
              className="drop-shadow-md w-[26px] h-[26px] sm:w-[36px] sm:h-[36px] md:w-[46px] md:h-[46px]"
            />
          </div>
          <h3 className="text-[0.85rem] sm:text-base md:text-lg font-bold mb-1">
            {title}
          </h3>
          {description && (
            <p className="text-[0.7rem] sm:text-sm md:text-base opacity-90 break-words whitespace-normal px-2 text-center leading-snug">
              {description}
            </p>
          )}
        </div>

        {/* פאה ימנית */}
        <div
          className="absolute"
          style={{
            width: `clamp(8px, 1.4vw, ${baseDepth}px)`,
            height: `clamp(150px, 38vw, ${baseHeight}px)`,
            top: `clamp(6px, 1.2vw, ${baseDepth}px)`,
            left: `clamp(130px, 33vw, ${baseSize}px)`,
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
            width: `clamp(130px, 33vw, ${baseSize}px)`,
            height: `clamp(8px, 1.4vw, ${baseDepth}px)`,
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



