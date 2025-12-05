"use client"

import Link from "next/link";
import LoanCalculator from "../calculators/simple_calculator/page";

export default function MortgageForSelfBuild() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-20 relative overflow-hidden bg-[#f4f6f9]">
      {/* שכבת רקע עם עומק עדין */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#edf1f5] via-[#f7f9fb] to-[#e8edf1]" />

      {/* שכבת אור רכה */}
      <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-white/40 blur-3xl rounded-full opacity-40" />

      {/* קופסה מרכזית */}
      <div className="relative z-10 w-[90%] max-w-4xl bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-10 md:p-14 transition-transform hover:-translate-y-1">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#1d75a1] text-center mb-6 leading-tight">
          משכנתא לבניה עצמית – הדרך לבית שתמיד רצית
        </h1>

        <p className="text-lg text-gray-700 leading-relaxed text-center mb-8">
          בניה עצמית מאפשרת לך לעצב את בית חלומותיך בדיוק כפי שתמיד דמיינת –
          אבל התהליך שונה לגמרי ממשכנתא רגילה לרכישת דירה.
          כאן נדרשים שלבים, אישורים, ושחרור כספים בהתאם לקצב הבניה.
        </p>

        {/* מקטעים תלת מימדיים */}
        <div className="space-y-8">

          {/* מהי משכנתא לבניה עצמית */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-blue-600 mb-2">
              מהי משכנתא לבניה עצמית?
            </h2>
            <p className="text-gray-700 leading-relaxed">
              משכנתא לבניה עצמית מיועדת למי שרכש מגרש, או מחזיק כבר במגרש,
              ורוצה לבנות עליו בית. בשונה ממשכנתא רגילה –
              כאן ההלוואה משוחררת בשלבים בהתאם להתקדמות הבניה בפועל.
              <br />
              הבנק מבצע הערכת שמאי ומאשר את ההלוואה על בסיס:
              <strong> שווי המגרש + עלות הבניה המתוכננת.</strong>
              <br />
              אחוז המימון המקסימלי עומד בדרך כלל על:
              <strong> 70% משווי הפרויקט הכולל.</strong>
              <br />
              ניתן לחשב את היכולת שלך בעזרת{" "}
              <Link
                href="/home/calculators/mortgage_capability"
                className="text-main font-semibold hover:underline hover:text-main/80 transition-colors"
              >
                מחשבון יכולת משכנתא
              </Link>.
            </p>
          </div>

          {/* מחשבון */}
          <LoanCalculator />

          {/* שלבי קבלת המשכנתא */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-green-600 mb-4">
              שלבי קבלת משכנתא לבניה עצמית
            </h2>
            <ul className="list-disc list-outside pl-6 text-gray-700 leading-relaxed space-y-1">
              <li>רכישת מגרש או בעלות קיימת על הקרקע.</li>
              <li>הצגת תכניות אדריכל + היתר בניה תקף.</li>
              <li>הערכת שמאי לקביעת שווי הפרויקט.</li>
              <li>אישור מסגרת המשכנתא על ידי הבנק.</li>
              <li>שחרור כספים בשלבי בניה: חפירה, שלד, קירות, גמר ועוד.</li>
              <li>כל שלב דורש ביקורת נוספת של שמאי מטעם הבנק.</li>
            </ul>
          </div>

          {/* טיפים חשובים */}
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-orange-600 mb-2">
              טיפים חשובים לבניה עצמית עם משכנתא
            </h2>
            <p className="text-gray-700 leading-relaxed">
              בניה עצמית יכולה להיות משתלמת מאוד – אך כוללת סיכונים ובלתי צפויות.
              חשוב לוודא:
            </p>
            <ul className="list-disc list-outside pl-6 text-gray-700 leading-relaxed space-y-1 mt-2">
              <li>לשמור רזרבה של לפחות 10%-15% מהתקציב.</li>
              <li>להתחיל עם קבלן רשום ובעל ניסיון בבנייה צמודת קרקע.</li>
              <li>לבדוק זמינות של חומרי בניין ועמידה בזמנים.</li>
              <li>לזכור שהבנק משחרר כסף רק אחרי ביצוע בפועל.</li>
              <li>להיערך לעיכובים טבעיים – שמאי, עירייה, קבלן.</li>
            </ul>
          </div>

          {/* מסלולי משכנתא לבניה עצמית */}
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-purple-600 mb-3">
              מסלולי משכנתא לבניה עצמית
            </h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              מסלולי המשכנתא דומים למסלולי משכנתא רגילה – אך מותאמים לשחרור בשלבים:
            </p>
            <ul className="list-disc list-outside pl-6 text-gray-700 leading-relaxed space-y-1">
              <li>ריבית קבועה לא צמודה – יציבות מוחלטת לאורך כל התקופה.</li>
              <li>ריבית פריים – מתאים למי שמחפש ריבית משתנה עם פוטנציאל חיסכון.</li>
              <li>ריבית משתנה כל 5 – מאפשרת עדכון תקופתי בהתאם לשוק.</li>
              <li>מסלול גישור (בלון חלקי/מלא) – עד לסיום הבניה וקבלת טופס 4.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
