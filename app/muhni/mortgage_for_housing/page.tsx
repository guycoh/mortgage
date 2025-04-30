"use client"


import Image from "next/image";
import Link from "next/link";

export default function MortgageForHousing() {
  return (
    <div className="bg-gray-50 min-h-screen py-12 px-6 sm:px-12 md:px-20">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl p-8 sm:p-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 text-center mb-6">
          משכנתא לדיור - הדרך לבית משלך
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed text-center mb-6">
          קניית דירה היא אחת ההחלטות הכלכליות החשובות ביותר בחיים. משכנתא לדיור מאפשרת לך להגשים את החלום ולהפוך לבעל נכס משלך,
          עם אפשרויות מימון מגוונות המותאמות לצרכים שלך.
        </p>
        <Image
          src="/assets/images/imgFiles/mortgage_housing.jpg"
          alt="משכנתא לדיור"
          width={400}
          height={200}
          className="rounded-xl mx-auto"
        />
        <div className="mt-8 space-y-6">
          <div className="bg-blue-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-blue-600">מהי משכנתא לדיור?</h2>
            <p className="text-gray-700 mt-2">
              משכנתא היא הלוואה בנקאית המאפשרת רכישת נכס למגורים תוך החזר חודשי לתקופה ארוכה. הבנק מספק מימון בהתאם להון העצמי שלך וליכולת ההחזר.
            </p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-green-600">מסלולי משכנתא נפוצים</h2>
            <ul className="list-disc list-inside text-gray-700 mt-2">
              <li>משכנתא בריבית קבועה – ביטחון מפני שינויים בריבית.</li>
              <li>משכנתא בריבית משתנה – אפשרות לנצל ירידות בריבית.</li>
              <li>משכנתא צמודה למדד – מותאמת לתנודות הכלכלה.</li>
              <li>משכנתא עם החזר בלון – תשלומים מופחתים בתחילת התקופה.</li>
            </ul>
          </div>
          <div className="bg-orange-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-orange-600">איך לבחור את המשכנתא המתאימה?</h2>
            <p className="text-gray-700 mt-2">
              בחירת משכנתא דורשת השוואת תנאים, חישוב עלויות ריבית ויכולת החזר חודשית. המומחים שלנו יסייעו לך להתאים את ההלוואה לתקציב ולצרכים שלך.
            </p>
          </div>
        </div>
         
        <div className="mt-10 flex justify-center">
          <Link
            href="/muhni/schedule"
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-md transition duration-300 whitespace-nowrap max-w-[90vw] overflow-hidden text-ellipsis"
          >
            קבעו פגישה עם מומחה למשכנתאות
          </Link>
        </div>
      </div>
    </div>
  );
}
