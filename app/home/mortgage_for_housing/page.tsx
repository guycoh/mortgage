"use client"

import Image from "next/image";
import Link from "next/link";
import LoanCalculator from "../calculators/simple_calculator/page";



export default function MortgageForHousing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-20 relative overflow-hidden bg-[#f4f6f9]">
      {/* שכבת רקע עם עומק עדין */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#edf1f5] via-[#f7f9fb] to-[#e8edf1]" />

      {/* שכבת אור רכה למראה תלת מימד */}
      <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-white/40 blur-3xl rounded-full opacity-40" />

      {/* קופסה מרכזית */}
      <div className="relative z-10 w-[90%] max-w-4xl bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-10 md:p-14 transition-transform hover:-translate-y-1">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#1d75a1] text-center mb-6 leading-tight">
          משכנתא לדיור – הדרך לבית משלך
        </h1>

        <p className="text-lg text-gray-700 leading-relaxed text-center mb-8">
          קניית דירה היא אחת ההחלטות הכלכליות החשובות ביותר בחיים. משכנתא לדיור מאפשרת לך להגשים את החלום ולהפוך לבעל נכס משלך,
          עם אפשרויות מימון מגוונות המותאמות לצרכים שלך.
        </p>

        <div className="flex justify-center mb-10">
          <Image
            src="/assets/images/imgFiles/mortgage_housing.jpg"
            alt="משכנתא לדיור"
            width={500}
            height={300}
            className="rounded-xl shadow-lg"
          />
        </div>

        {/* מקטעים תלת מימדיים */}
        <div className="space-y-8">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-blue-600 mb-2">
              מהי משכנתא לדיור?
            </h2>
            <p className="text-gray-700 leading-relaxed">
              משכנתא היא הלוואה בנקאית המאפשרת רכישת נכס למגורים תוך החזר חודשי לתקופה ארוכה. 
              הבנק מספק מימון בהתאם להון העצמי שלך וליכולת ההחזר.
            </p>
          </div>
  <LoanCalculator />
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-green-600 mb-2">
              מסלולי משכנתא נפוצים
            </h2>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed">
              <li>משכנתא בריבית קבועה – ביטחון מפני שינויים בריבית.</li>
              <li>משכנתא בריבית משתנה – אפשרות לנצל ירידות בריבית.</li>
              <li>משכנתא צמודה למדד – מותאמת לתנודות הכלכלה.</li>
              <li>משכנתא עם החזר בלון – תשלומים מופחתים בתחילת התקופה.</li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-orange-600 mb-2">
              איך לבחור את המשכנתא המתאימה?
            </h2>
            <p className="text-gray-700 leading-relaxed">
              בחירת משכנתא דורשת השוואת תנאים, חישוב עלויות ריבית ויכולת החזר חודשית. 
              המומחים שלנו יסייעו לך להתאים את ההלוואה לתקציב ולצרכים שלך.
            </p>
          </div>
        </div>

        {/* קריאה לפעולה */}
        <div className="mt-12 flex justify-center">
          <Link
            href="/muhni/schedule"
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 px-8 rounded-xl text-lg shadow-md transition duration-300 hover:shadow-lg"
          >
            קבעו פגישה עם מומחה למשכנתאות
          </Link>
        </div>
      </div>
    </div>
  );
}
