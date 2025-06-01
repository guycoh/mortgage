'use client';

import Calculator1 from "public/assets/images/svg/Calculator1";
import Calculator2 from "public/assets/images/svg/Calculator2";
import Calculator3 from "public/assets/images/svg/Calculator3";
import Calculator4 from "public/assets/images/svg/Calculator4";
import Calculator5 from "public/assets/images/svg/Calculator5";
import Calculator6 from "@/public/assets/images/svg/Calculator6";
import Calculator7 from "@/public/assets/images/svg/Calculator7";
import Calculator8 from "@/public/assets/images/svg/Calculator8";
import Link from 'next/link';


const calculators = [
  { title: "מחשבון פשוט", description: "חשב את ההחזר החודשי", link: "/muhni7/calculators/simple_calculator", icon: Calculator2 },
  { title: "מחשבון כמה משכנתא אוכל לקבל?", description: "", link: "/muhni7/calculators/mortgage_capability", icon: Calculator3 },
  { title: "מחשבון מס רכישה", description: "בדוק כמה מס רכישה תצטרך לשלם.", link: "/muhni7/calculators/purchase_tax_calculator", icon: Calculator4 },
  { title: "מחשבון מחיר למשתכן", description: "חשב את ההוצאות והתנאים לזכאות.", link: "/muhni7/calculators/mechir_la_mishtaken", icon: Calculator7 },
  { title: "מחשבון עלויות נלוות", description: "בדוק מה העלויות הנלוות", link: "/muhni7/calculators/costs_calculator", icon: Calculator8 },
  { title: "מחשבון קרן שווה", description: "קרן שווה ", link: "/muhni7/calculators/equal_principal", icon: Calculator8 },
  { title: "מחשבון כדאיות מחזור", description: "בדוק האם משתלם לך למחזר את המשכנתא.", link: "/muhni7/calculators/refinance-calculator", icon: Calculator1 },  
  { title: "מחשבון זכאות", description: "חשב זכאות משרד השיכון", link: "/muhni7/calculators/eligibility_calculator", icon: Calculator5 },
  { title: "מחשבון משכנתא", description: "חשב את ההחזר החודשי שלך.", link: "/muhni7/calculators/refinance-calculator", icon: Calculator6 },
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
 <div className="min-h-screen bg-galbg py-10 px-4 sm:px-8 md:px-16 lg:px-24 xl:px-32 2xl:px-40">
  <h1 className="text-center text-gray-900 text-3xl font-bold mb-10 tracking-wide drop-shadow-lg">
    מחשבוני משכנתא 
  </h1>
  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
    {calculators.map((calc, index) => {
      const Icon = calc.icon;
      return (
        <Link href={calc.link} key={index}>
          <div className="bg-white backdrop-blur-md p-6 rounded-3xl border border-main hover:border-main transition-all duration-300 cursor-pointer flex flex-col items-center text-center h-60 hover:scale-[1.04] hover:shadow-main/30 hover:shadow-2xl group">
            <div className="bg-main/10 rounded-full p-4 mb-4 shadow-md group-hover:rotate-[8deg] transition-transform duration-300">
              <Icon size={42} color="#4b0082" className="w-12 h-12 drop-shadow-md" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2 tracking-wide drop-shadow-sm">
              {calc.title}
            </h2>
           
          </div>
        </Link>
      );
    })}
  </div>
</div>


  );
}

















