"use client"

import Image from "next/image";
import Link from "next/link";

export default function LoanConsolidation() {
  return (
    <div className="bg-gray-50 min-h-screen py-12 px-6 sm:px-12 md:px-20">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl p-8 sm:p-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 text-center mb-6">
          איחוד הלוואות - הפתרון ליציאה מחובות
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed text-center mb-6">
          איחוד הלוואות מאפשר לכם לשלב מספר הלוואות להלוואה אחת עם תנאים טובים יותר, ריבית נמוכה יותר, והחזר חודשי נוח.
          זהו פתרון חכם למי שמעוניין להקל על העומס הכלכלי ולנהל את ההתחייבויות הפיננסיות בצורה נוחה ויעילה יותר.
        </p>
        <Image
          src="/assets/images/imgFiles/loan_consolidation.jpg"
          alt="איחוד הלוואות"
          width={400}
          height={200}
          className="rounded-xl mx-auto"
        />
        <div className="mt-8 space-y-6">
          <div className="bg-orange-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-orange-600">מהו איחוד הלוואות?</h2>
            <p className="text-gray-700 mt-2">
              איחוד הלוואות הוא תהליך פיננסי שבו משלבים מספר הלוואות קטנות להלוואה אחת עם תנאים נוחים יותר.
              כך ניתן להוריד את ההחזר החודשי ולשלם פחות ריבית לאורך זמן.
            </p>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-blue-600">למי מתאים איחוד הלוואות?</h2>
            <ul className="list-disc list-inside text-gray-700 mt-2">
              <li>מי שיש לו מספר הלוואות עם החזרים חודשיים גבוהים</li>
              <li>מי שמעוניין להפחית את הריבית ולשלם פחות לאורך זמן</li>
              <li>מי שמתקשה לעמוד בתשלומים החודשיים</li>
              <li>מי שמעוניין לנהל את ההתחייבויות הכספיות בצורה מסודרת</li>
            </ul>
          </div>
          <div className="bg-green-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-green-600">היתרונות של איחוד הלוואות</h2>
            <ul className="list-disc list-inside text-gray-700 mt-2">
              <li>הפחתת ההחזר החודשי - ניהול טוב יותר של התקציב</li>
              <li>תנאים טובים יותר - ריבית נמוכה יותר</li>
              <li>תשלומים נוחים - הלוואה אחת במקום כמה</li>
              <li>פחות לחץ כלכלי - שיפור היציבות הפיננסית</li>
              <li>מניעת צבירת חובות נוספים</li>
            </ul>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-purple-600">תהליך איחוד הלוואות</h2>
            <p className="text-gray-700 mt-2">
              התהליך כולל בדיקה של כלל ההלוואות הקיימות, מציאת מסלול משתלם יותר, קבלת אישור להלוואה חדשה וסגירת
              ההתחייבויות הקיימות. מומלץ להתייעץ עם מומחה פיננסי כדי למצוא את הפתרון המשתלם ביותר עבורכם.
            </p>
          </div>
        </div>
         
        <div className="mt-10 flex justify-center">
          <Link
            href="/muhni7/schedule"
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-md transition duration-300 whitespace-nowrap max-w-[90vw] overflow-hidden text-ellipsis"
          >
            קבעו פגישה עם מומחה למשכנתאות
          </Link>
        </div>
      </div>
    </div>
  );
}
