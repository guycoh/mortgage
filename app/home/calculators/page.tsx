"use client"
import Image from "next/image";
import Link from "next/link";


const calculators = [
    { title: "מחשבון משכנתא", description: "חשב את ההחזר החודשי והיכולת הכלכלית שלך.", link: "/home/calculators/mortgage_calculator" },
    { title: "מחשבון כדאיות מחזור", description: "בדוק האם משתלם לך למחזר את המשכנתא.", link: "/home/calculators/refinance-calculator" },
    { title: "מחשבון מחיר למשתכן", description: "חשב את ההוצאות והתנאים לזכאות.", link: "/affordable-housing-calculator" },
    { title: "מחשבון מס רכישה", description: "בדוק כמה מס רכישה תצטרך לשלם.", link: "/home/calculators/purchase_tax_calculator" },
    { title: "מחשבון כמה משכנתא אוכל לקבל", description: "הערכת סכום המשכנתא האפשרי עבורך.", link: "/home/calculators/mortgage_capability" },
  ];
  
  export default function CalculatorsPage() {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-center mb-6">מחשבונים</h1>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {calculators.map((calc, index) => (
              <Link href={calc.link} key={index}>
                <div className="bg-white p-4 rounded-2xl shadow-lg flex flex-col items-center text-center hover:shadow-xl transition cursor-pointer h-44">
                <Image src="/assets/svgFiles/calculator.svg" alt="calculator" className="text-blue-500 text-4xl mb-2 "width={50} height={50}  />

      
                  <div className="flex flex-col justify-between h-full">
                    <h2 className="text-lg font-semibold">{calc.title}</h2>
                    <p className="text-gray-600 text-sm">{calc.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }






