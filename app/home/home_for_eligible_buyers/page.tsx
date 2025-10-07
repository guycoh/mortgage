"use client";

import Image from "next/image";
import Link from "next/link";

export default function AffordableHousing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-20 relative overflow-hidden bg-[#f4f6f9]">
      {/* רקע תלת־ממדי רך */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#edf1f5] via-[#f7f9fb] to-[#e8edf1]" />
      <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-white/40 blur-3xl rounded-full opacity-40" />

      {/* קונטיינר ראשי */}
      <div className="relative z-10 w-[90%] max-w-4xl bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-10 md:p-14 transition-transform hover:-translate-y-1">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#1d75a1] text-center mb-6 leading-tight">
          מחיר למשתכן — המדריך המלא לרוכשי דירות
        </h1>

        <p className="text-lg text-gray-700 leading-relaxed text-center mb-8">
          תוכנית מחיר למשתכן נועדה לסייע לזוגות צעירים ולרוכשי דירה ראשונה
          לרכוש דירה במחיר מוזל, בתנאים מסובסדים ובפיקוח ממשלתי.
        </p>

        <div className="flex justify-center mb-10">
          <Image
            src="/assets/images/imgFiles/home_for_eligible_buyers.jpg"
            alt="מחיר למשתכן"
            width={500}
            height={300}
            className="rounded-xl shadow-lg"
          />
        </div>

        {/* מקטעים אלגנטיים */}
        <div className="space-y-8">
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-orange-600 mb-2">
              מהי תוכנית מחיר למשתכן?
            </h2>
            <p className="text-gray-700 leading-relaxed">
              יוזמה ממשלתית שמטרתה לספק דיור נגיש לזכאים. הדירות נמכרות
              במחירים נמוכים ממחירי השוק, בהתאם לקריטריוני זכאות מוגדרים.
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-blue-600 mb-2">
              מי זכאי להשתתף בתוכנית?
            </h2>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed">
              <li>זוגות נשואים או ידועים בציבור ללא דירה בבעלותם</li>
              <li>רווקים ורווקות מעל גיל 35</li>
              <li>משפחות חד-הוריות עם ילד אחד לפחות</li>
              <li>נכים עם נכות של 75% ומעלה</li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-green-600 mb-2">
              שלבי ההשתתפות בתוכנית
            </h2>
            <ol className="list-decimal list-inside text-gray-700 leading-relaxed">
              <li>בדיקת זכאות והרשמה באתר משרד השיכון</li>
              <li>קבלת תעודת זכאות</li>
              <li>השתתפות בהגרלות לפרויקטים פעילים</li>
              <li>זכייה ובחירת דירה בפרויקט</li>
              <li>חתימה על חוזה רכישה בתנאים מועדפים</li>
            </ol>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-purple-600 mb-2">
              יתרונות מרכזיים
            </h2>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed">
              <li>מחירים נמוכים ממחירי השוק</li>
              <li>מימון נוח ומשכנתא מסובסדת</li>
              <li>העדפה לתושבי האזור בפרויקטים מסוימים</li>
              <li>ליווי ממשלתי ובקרה על איכות הפרויקטים</li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-yellow-600 mb-2">
              שאלות נפוצות
            </h2>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed">
              <li>
                האם ניתן למכור את הדירה מיד? יש תקופת התחייבות למגורים בנכס.
              </li>
              <li>
                האם ניתן להשתתף במספר הגרלות? כן, אך ניתן לרכוש דירה אחת בלבד.
              </li>
              <li>
                האם ניתן לשדרג דירה לאחר זכייה? כן, בתנאים מוגבלים.
              </li>
              <li>לא זכיתי בהגרלה — מה עכשיו? ניתן להירשם להגרלות נוספות.</li>
            </ul>
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
