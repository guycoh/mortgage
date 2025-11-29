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

        
        {/* מקטעים תלת מימדיים */}
        <div className="space-y-8">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-blue-600 mb-2">
              מהי משכנתא לדיור?
            </h2>
              <p className="text-gray-700 leading-relaxed">
                משכנתא היא הלוואה בנקאית המאפשרת רכישת נכס למגורים או להשקעה,
                תוך החזר חודשי קבוע או משתנה לאורך תקופה ארוכה.
                מדובר בהלוואה בעלת הריבית הנמוכה ביותר מבין סוגי ההלוואות,
                במיוחד כשמדובר בהלוואות ארוכות טווח.
                גובה המימון שהבנק מאשר נקבע בהתאם להון העצמי שלך וליכולת ההחזר הכלכלית,
                כאשר אחוז המימון המרבי עומד על <strong>75%</strong> לדירה יחידה,
                <strong>70%</strong> לדירה חליפית ו־<strong>50%</strong> לדירה נוספת.
                <br className="hidden md:block" />
                מוזמן לבדוק באמצעות{" "}
                <Link
                  href="/home/calculators/mortgage_capability"
                  className="text-main font-semibold hover:underline hover:text-main/80 transition-colors"
                >
                  המחשבון שלנו כמה משכנתא תוכל לקבל בהתאם לנתוניך האישיים
                </Link>
                .
              </p>

          </div>
         <LoanCalculator />
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-green-600 mb-4">
              מסלולי משכנתא נפוצים
            </h2>
            <ul className="list-disc list-outside pl-6 text-gray-700 leading-relaxed">
              <li>
                מסלול בריבית קבועה – מסלול יציב המעניק ביטחון מפני שינויים עתידיים בריבית. 
                לפי הנחיות בנק ישראל, נדרש מינימום של שליש מההלוואה במסלול ריבית קבועה.
              </li>
              <li>
                מסלול בריבית פריים – הריבית מושפעת מריבית בנק ישראל, ופריים מייצג את ריבית בנק ישראל + 1.5%.
                מתאים למי שרוצה ריבית משתנה עם פוטנציאל להוזלה, אך סיכון לעלייה.
              </li>
              <li>
                מסלול בריבית משתנה – מאפשר לנצל ירידות עתידיות בריבית, אך כולל סיכון לעלייה.
              </li>
              <li>
                מסלול צמוד למדד – ההחזרים מתעדכנים בהתאם לשינויים במדד המחירים לצרכן.
              </li>
              <li>
                מסלול עם החזר בלון – מאפשר תשלומים מופחתים בתחילת התקופה, עם פירעון עיקרי בסוף.
              </li>
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

        {/* <div className="flex justify-center mb-10">
          <Image
            src="/assets/images/imgFiles/mortgage_housing.jpg"
            alt="משכנתא לדיור"
            width={500}
            height={300}
            className="rounded-xl shadow-lg"
          />
        </div>
       */}






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
