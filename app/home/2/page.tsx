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
  const depth = 20; // עומק הקובייה
  const cubeColor = "#1d75a1"; // צבע אחיד לכל הפאות

  return (
    <Link href={link}>
      <div
        className="relative cursor-pointer hover:scale-[1.05] transition-all duration-300"
        style={{ width: size + depth, height: height + depth }}
      >
        {/* פאה קדמית */}
        <div
          className="absolute flex flex-col items-center justify-center text-white text-center shadow-lg rounded-none"
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
          {description && <p className="text-sm opacity-90">{description}</p>}
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
      <h1 className="text-center text-gray-900 text-3xl font-bold mb-10 tracking-wide drop-shadow-lg">
        מחשבוני משכנתא בתלת־ממד
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-12 justify-items-center">
        {calculators.slice(0, 8).map((calc, i) => (
          <CalculatorCube key={i} {...calc} />
        ))}
      </div>
    </div>
  );
}
