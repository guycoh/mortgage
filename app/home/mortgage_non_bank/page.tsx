"use client";

import Image from "next/image";
import Link from "next/link";

export default function PrivateMortgage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-20 relative overflow-hidden bg-[#f4f6f9]">
      {/* שכבת רקע עם עומק עדין */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#edf1f5] via-[#f7f9fb] to-[#e8edf1]" />

      {/* שכבת אור רכה למראה תלת מימד */}
      <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-white/40 blur-3xl rounded-full opacity-40" />

      <div className="relative z-10 w-[90%] max-w-4xl bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-10 md:p-14 transition-transform hover:-translate-y-1">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#1d75a1] text-center mb-6 leading-tight">
          משכנתא חוץ בנקאית – פתרון גמיש ומהיר
        </h1>

        <p className="text-lg text-gray-700 leading-relaxed text-center mb-8">
          לא תמיד הבנק הוא הכתובת היחידה. משכנתא חוץ בנקאית מהווה אלטרנטיבה יעילה ונגישה עבור מי שזקוק למימון מהיר, עם פחות בירוקרטיה ויותר גמישות.
        </p>

        <div className="flex justify-center mb-10">
          <Image
            src="/assets/images/imgFiles/non_bank.jpg"
            alt="משכנתא חוץ בנקאית"
            width={500}
            height={300}
            className="rounded-xl shadow-lg"
          />
        </div>

        {/* מקטעים תלת מימדיים */}
        <div className="space-y-8">
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-purple-600 mb-2">
              מהי משכנתא חוץ בנקאית?
            </h2>
            <p className="text-gray-700 leading-relaxed">
              משכנתא חוץ בנקאית ניתנת על ידי גופים פיננסיים פרטיים שאינם בנקים, והיא מאפשרת לקבל מימון מהיר לרכישת דירה, מיחזור חובות, השקעה בנדל"ן או כל מטרה אחרת, גם למי שלא זכאי למשכנתא מהבנק.
            </p>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-yellow-600 mb-2">
              יתרונות המשכנתא החוץ בנקאית
            </h2>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed">
              <li>אישור מהיר תוך מספר ימים</li>
              <li>פחות בירוקרטיה ובדיקות אשראי גמישות</li>
              <li>פתרון למי שסורב על ידי הבנק</li>
              <li>אפשרות לדיון גמיש בתנאי ההחזר</li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-red-50 to-red-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-red-600 mb-2">
              מה חשוב לדעת לפני שלוקחים?
            </h2>
            <p className="text-gray-700 leading-relaxed">
              משכנתא חוץ בנקאית כוללת לרוב ריביות גבוהות יותר ודורשת הבנה מדויקת של תנאי ההלוואה. חשוב לבדוק את הרישוי של הגוף המלווה, ולוודא שקיבלתם ליווי מקצועי לפני קבלת ההחלטה.
            </p>
          </div>
        </div>

        {/* קריאה לפעולה */}
        <div className="mt-12 flex justify-center">
          <Link
            href="/muhni/schedule"
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 px-8 rounded-xl text-lg shadow-md transition duration-300 hover:shadow-lg"
          >
            דברו עם יועץ למשכנתאות חוץ בנקאיות
          </Link>
        </div>
      </div>
    </div>
  );
}
