"use client";

import Image from "next/image";
import Link from "next/link";

export default function MortgageRefinance() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start font-open-sans font-normal  py-20 relative overflow-hidden bg-[#f4f6f9]">
      {/* שכבת רקע עם עומק עדין */}
      <div className="absolute inset-0 bg-linear-to-br from-[#edf1f5] via-[#f7f9fb] to-[#e8edf1]" />

      {/* שכבת אור רכה למראה תלת מימד */}
      <div className="absolute -top-37.5 left-1/2 -translate-x-1/2 w-300 h-150 bg-white/40 blur-3xl rounded-full opacity-40" />

      <div className="relative z-10 w-[90%] max-w-4xl bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-10 md:p-14 transition-transform hover:-translate-y-1">
        <h1 className="text-4xl sm:text-4xl font-bold text-[#1d75a1] text-center mb-6 leading-tight">
          מחזור משכנתא – הדרך לחסוך אלפי שקלים
        </h1>

        <p className="text-xl text-gray-700 leading-relaxed text-center mb-8">
          מחזור משכנתא מאפשר לכם להחליף את ההלוואה הקיימת במשכנתא חדשה עם תנאים טובים יותר, ריבית נמוכה יותר,
          או החזר חודשי מופחת. התהליך עשוי להוזיל את ההוצאות החודשיות שלכם ולחסוך לכם סכומים משמעותיים לאורך השנים.
        </p>

        <div className="flex justify-center mb-10">
          <Image
            src="/assets/images/imgFiles/mortgage_refinance.jpg"
            alt="מחזור משכנתא"
            width={500}
            height={300}
            className="rounded-xl shadow-lg"
          />
        </div>

        {/* מקטעים תלת מימדיים */}
        <div className="space-y-8">
          <div className="bg-linear-to-r from-orange-50 to-orange-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-3xl font-semibold text-orange-600 mb-2">
              למה למחזר את המשכנתא?
            </h2>
            <ul className="text-xl list-disc list-inside text-gray-700 leading-relaxed">
              <li>הפחתת גובה ההחזר החודשי</li>
              <li>קיצור תקופת המשכנתא</li>
              <li>שיפור תנאי הריבית</li>
              <li>מעבר למסלול ריבית קבועה או משתנה</li>
              <li>שחרור כספים לצרכים נוספים</li>
            </ul>
          </div>

          <div className="bg-linear-to-r from-blue-50 to-blue-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-3xl font-semibold text-blue-600 mb-2">
              איך מתבצע תהליך מחזור המשכנתא?
            </h2>
            <p className="text-gray-700 leading-relaxed text-xl">
              תהליך המחזור כולל בדיקה של המשכנתא הנוכחית, השוואת הצעות חדשות, חישוב עלויות המחזור, וקבלת משכנתא חדשה
              עם תנאים טובים יותר. המומחים שלנו ילוו אתכם בכל שלב ויוודאו שתקבלו את ההחלטה הטובה ביותר.
            </p>
          </div>

          <div className="bg-linear-to-r from-green-50 to-green-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-3xl font-semibold text-green-600 mb-2">
              למי מתאים מחזור משכנתא?
            </h2>
            <p className="text-gray-700 leading-relaxed text-xl">
              אם לקחתם משכנתא לפני מספר שנים, אם הריבית במשק ירדה, אם יש לכם הוצאות חודשיות גבוהות או שאתם רוצים
              לקצר את תקופת המשכנתא – מחזור המשכנתא יכול להיות פתרון חכם עבורכם.
            </p>
          </div>
        </div>

        {/* קריאה לפעולה */}
        <div className="mt-12 flex justify-center">
          <Link
            href="/muhni/schedule"
            className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 px-8 rounded-xl text-lg shadow-md transition duration-300 hover:shadow-lg"
          >
            קבעו פגישה עם מומחה למשכנתאות
          </Link>
        </div>
      </div>
    </div>
  );
}
