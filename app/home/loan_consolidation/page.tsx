"use client"

import Image from "next/image";
import Link from "next/link";

export default function LoanConsolidation() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-20 relative overflow-hidden bg-[#f4f6f9]">
      {/* שכבת רקע עם עומק עדין */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#edf1f5] via-[#f7f9fb] to-[#e8edf1]" />

      {/* שכבת אור רכה למראה תלת מימד */}
      <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-white/40 blur-3xl rounded-full opacity-40" />

      <div className="relative z-10 w-[90%] max-w-4xl bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-10 md:p-14 transition-transform hover:-translate-y-1">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#1d75a1] text-center mb-6 leading-tight">
          איחוד הלוואות – הפתרון ליציאה מחובות
        </h1>

        <p className="text-lg text-gray-700 leading-relaxed text-center mb-8">
          איחוד הלוואות מאפשר לכם לשלב מספר הלוואות להלוואה אחת עם תנאים טובים יותר,
          ריבית נמוכה יותר, והחזר חודשי נוח. זהו פתרון חכם למי שמעוניין להקל על העומס
          הכלכלי ולנהל את ההתחייבויות הפיננסיות בצורה נוחה ויעילה יותר.
        </p>

        <div className="flex justify-center mb-10">
          <Image
            src="/assets/images/imgFiles/loan_consolidation.jpg"
            alt="איחוד הלוואות"
            width={500}
            height={300}
            className="rounded-xl shadow-lg"
          />
        </div>

        {/* מקטעים מעוצבים */}
        <div className="space-y-8">
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-orange-600 mb-2">
              מהו איחוד הלוואות?
            </h2>
            <p className="text-gray-700 leading-relaxed">
              איחוד הלוואות הוא תהליך פיננסי שבו משלבים מספר הלוואות קטנות להלוואה אחת עם תנאים נוחים יותר.
              כך ניתן להוריד את ההחזר החודשי ולשלם פחות ריבית לאורך זמן.
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-blue-600 mb-2">
              למי מתאים איחוד הלוואות?
            </h2>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed">
              <li>מי שיש לו מספר הלוואות עם החזרים חודשיים גבוהים</li>
              <li>מי שמעוניין להפחית את הריבית ולשלם פחות לאורך זמן</li>
              <li>מי שמתקשה לעמוד בתשלומים החודשיים</li>
              <li>מי שמעוניין לנהל את ההתחייבויות הכספיות בצורה מסודרת</li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-green-600 mb-2">
              היתרונות של איחוד הלוואות
            </h2>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed">
              <li>הפחתת ההחזר החודשי – ניהול טוב יותר של התקציב</li>
              <li>תנאים טובים יותר – ריבית נמוכה יותר</li>
              <li>תשלומים נוחים – הלוואה אחת במקום כמה</li>
              <li>פחות לחץ כלכלי – שיפור היציבות הפיננסית</li>
              <li>מניעת צבירת חובות נוספים</li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-purple-600 mb-2">
              תהליך איחוד הלוואות
            </h2>
            <p className="text-gray-700 leading-relaxed">
              התהליך כולל בדיקה של כלל ההלוואות הקיימות, מציאת מסלול משתלם יותר,
              קבלת אישור להלוואה חדשה וסגירת ההתחייבויות הקיימות. מומלץ להתייעץ עם
              מומחה פיננסי כדי למצוא את הפתרון המשתלם ביותר עבורכם.
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
