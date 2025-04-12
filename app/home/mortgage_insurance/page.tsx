"use client"

import Image from "next/image";
import Link from "next/link";

export default function MortgageInsurance() {
  return (
    <div className="bg-gray-50 min-h-screen py-12 px-6 sm:px-12 md:px-20">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl p-8 sm:p-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 text-center mb-6">
          ביטוח חיים ומבנה למשכנתא - כל מה שצריך לדעת
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed text-center mb-6">
          ביטוח חיים וביטוח מבנה למשכנתא הם דרישות חובה של הבנקים בישראל למי שלוקח משכנתא. מטרתם להגן על הבנק, על הלווים,
          ועל הנכס במקרה של אירועים בלתי צפויים.
        </p>
        <Image
          src="/assets/images/imgFiles/mortgage_insurance.jpg"
          alt="ביטוח חיים ומבנה למשכנתא"
          width={400}
          height={200}
          className="rounded-xl mx-auto"
        />
        <div className="mt-8 space-y-6">
          <div className="bg-orange-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-orange-600">מהו ביטוח חיים למשכנתא?</h2>
            <p className="text-gray-700 mt-2">
              ביטוח חיים למשכנתא נועד להבטיח שבמקרה של פטירת אחד הלווים, יתרת ההלוואה תכוסה על ידי חברת הביטוח,
              והמשפחה לא תצטרך לשאת בנטל החוב.
            </p>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-blue-600">מהו ביטוח מבנה למשכנתא?</h2>
            <p className="text-gray-700 mt-2">
              ביטוח מבנה למשכנתא נועד להגן על הנכס מפני נזקים כמו שריפות, הצפות, רעידות אדמה ונזקים מבניים נוספים.
              הבנק מחייב את הביטוח כדי להבטיח שהנכס, המשמש כערבות להלוואה, ישמור על ערכו.
            </p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-green-600">היתרונות של ביטוח חיים ומבנה למשכנתא</h2>
            <ul className="list-disc list-inside text-gray-700 mt-2">
              <li>הגנה כלכלית על המשפחה במקרה של פטירת אחד הלווים</li>
              <li>שמירה על ערך הנכס והגנה מפני נזקים בלתי צפויים</li>
              <li>תנאי ביטוח מותאמים אישית לפי צורכי הלווה</li>
              <li>אפשרות להוזיל את העלויות על ידי השוואת מחירים</li>
              <li>רוגע וביטחון כלכלי לאורך חיי המשכנתא</li>
            </ul>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-purple-600">איך לבחור ביטוח חיים ומבנה למשכנתא?</h2>
            <p className="text-gray-700 mt-2">
              מומלץ להשוות בין הצעות של חברות ביטוח שונות, לבדוק את גובה הפרמיה, הכיסויים הנכללים בפוליסה,
              והאם יש החרגות מיוחדות. בנוסף, ניתן לבחור בביטוח דרך הבנק או בחברת ביטוח פרטית.
            </p>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-yellow-600">שאלות נפוצות על ביטוח משכנתא</h2>
            <ul className="list-disc list-inside text-gray-700 mt-2">
              <li>האם ניתן להוזיל את עלות הביטוח? כן, באמצעות השוואת מחירים ומעבר בין חברות ביטוח.</li>
              <li>האם ניתן לבטל את הביטוח לאחר סיום המשכנתא? כן, לאחר פירעון ההלוואה אין חובה להחזיק בביטוח.</li>
              <li>מה קורה אם אני לא משלם את הביטוח? הבנק עשוי לדרוש הפעלת ביטוח דרכו, בעלות גבוהה יותר.</li>
              <li>האם הביטוח מכסה גם תכולת הדירה? לא, ביטוח תכולה הוא פוליסה נפרדת שניתן לרכוש בנוסף.</li>
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