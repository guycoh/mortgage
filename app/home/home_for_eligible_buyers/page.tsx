"use client"


import Image from "next/image";
import Link from "next/link";

export default function AffordableHousing() {
  return (
    <div className="bg-gray-50 min-h-screen py-12 px-6 sm:px-12 md:px-20">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl p-8 sm:p-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 text-center mb-6">
          מחיר למשתכן - המדריך המלא לרוכשי דירות
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed text-center mb-6">
          תוכנית מחיר למשתכן היא יוזמה ממשלתית שנועדה לסייע לזוגות צעירים ולרוכשי דירה ראשונה לרכוש דירה במחיר מוזל.
          התוכנית מאפשרת לקבל הנחות משמעותיות ברכישת דירה, בתנאים מיוחדים ומסובסדים.
        </p>
        <Image
          src="/assets/images/imgFiles/affordable_housing.jpg"
          alt="מחיר למשתכן"
          width={400}
          height={200}
          className="rounded-xl mx-auto"
        />
        <div className="mt-8 space-y-6">
          <div className="bg-orange-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-orange-600">מהי תוכנית מחיר למשתכן?</h2>
            <p className="text-gray-700 mt-2">
              תוכנית מחיר למשתכן היא תוכנית ממשלתית שמטרתה לספק דיור במחירים נוחים לזכאים.
              הדירות בתוכנית נמכרות במחיר נמוך ממחירי השוק, תוך קביעת קריטריונים לזכאות ולתהליך ההגרלה.
            </p>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-blue-600">מי זכאי להשתתף בתוכנית?</h2>
            <ul className="list-disc list-inside text-gray-700 mt-2">
              <li>זוגות נשואים או ידועים בציבור ללא דירה בבעלותם</li>
              <li>רווקים ורווקות מעל גיל 35</li>
              <li>משפחות חד-הוריות עם לפחות ילד אחד</li>
              <li>נכים בעלי 75% נכות ומעלה</li>
            </ul>
          </div>
          <div className="bg-green-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-green-600">מהם שלבי ההשתתפות בתוכנית?</h2>
            <ol className="list-decimal list-inside text-gray-700 mt-2">
              <li>בדיקת זכאות והרשמה באתר משרד השיכון</li>
              <li>קבלת תעודת זכאות</li>
              <li>השתתפות בהגרלות לפרויקטים נבחרים</li>
              <li>זכייה בהגרלה וקבלת אפשרות לרכישת הדירה</li>
              <li>בחירת הדירה וחתימה על חוזה רכישה</li>
            </ol>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-purple-600">היתרונות של מחיר למשתכן</h2>
            <ul className="list-disc list-inside text-gray-700 mt-2">
              <li>מחיר נמוך ממחירי השוק</li>
              <li>תנאי מימון נוחים למשכנתא</li>
              <li>אפשרות בחירת דירה מתוך פרויקטים איכותיים</li>
              <li>סיוע ממשלתי במימון הרכישה</li>
              <li>עדיפות לתושבי האזור בפרויקטים מסוימים</li>
            </ul>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-yellow-600">שאלות נפוצות</h2>
            <ul className="list-disc list-inside text-gray-700 mt-2">
              <li>האם ניתן למכור את הדירה מיד לאחר הרכישה? יש תקופת התחייבות מינימלית למגורים בנכס.</li>
              <li>האם ניתן להשתתף ביותר מהגרלה אחת? כן, אך ניתן לרכוש דירה אחת בלבד.</li>
              <li>האם ניתן לשדרג דירה לאחר הזכייה? כן, אך בתנאים מוגבלים.</li>
              <li>מה קורה אם לא זוכים בהגרלה? ניתן להשתתף בהגרלות נוספות.</li>
            </ul>
          </div>
        </div>
         
        <div className="mt-10 flex justify-center">
          <Link
            href="/home/schedule"
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-md transition duration-300 whitespace-nowrap max-w-[90vw] overflow-hidden text-ellipsis"
          >
            קבעו פגישה עם מומחה למשכנתאות
          </Link>
        </div>
      </div>
    </div>
  );
}
