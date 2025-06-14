"use client"

import Image from "next/image";
import Link from "next/link";

export default function PrivateMortgage() {
  return (
    <div className="bg-galbg min-h-screen py-12 px-6 sm:px-12 md:px-20">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl p-8 sm:p-12">
        <div className="animate-tracking-in-expand-fwd text-3xl sm:text-4xl font-bold text-gray-800 text-center mb-6">
           משכנתא חוץ בנקאית – פתרון גמיש ומהיר
        </div>      
        
        <p className="text-lg text-gray-600 leading-relaxed text-center mb-6">
          לא תמיד הבנק הוא הכתובת היחידה. משכנתא חוץ בנקאית מהווה אלטרנטיבה יעילה ונגישה עבור מי שזקוק למימון מהיר, עם פחות בירוקרטיה ויותר גמישות.
        </p>
        <Image
          src="/assets/images/imgFiles/non_bank.jpg"
          alt="משכנתא חוץ בנקאית"
          width={400}
          height={200}
          className="rounded-xl mx-auto"
        />
        <div className="mt-8 space-y-6">
          <div className="bg-purple-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-purple-600">מהי משכנתא חוץ בנקאית?</h2>
            <p className="text-gray-700 mt-2">
              משכנתא חוץ בנקאית ניתנת על ידי גופים פיננסיים פרטיים שאינם בנקים, והיא מאפשרת לקבל מימון מהיר לרכישת דירה, מיחזור חובות, השקעה בנדל"ן או כל מטרה אחרת, גם למי שלא זכאי למשכנתא מהבנק.
            </p>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-yellow-600">יתרונות המשכנתא החוץ בנקאית</h2>
            <ul className="list-disc list-inside text-gray-700 mt-2">
              <li>אישור מהיר תוך מספר ימים.</li>
              <li>פחות בירוקרטיה ובדיקות אשראי גמישות.</li>
              <li>פתרון למי שסורב על ידי הבנק.</li>
              <li>אפשרות לדיון גמיש בתנאי ההחזר.</li>
            </ul>
          </div>
          <div className="bg-red-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-red-600">מה חשוב לדעת לפני שלוקחים?</h2>
            <p className="text-gray-700 mt-2">
              משכנתא חוץ בנקאית כוללת לרוב ריביות גבוהות יותר ודורשת הבנה מדויקת של תנאי ההלוואה. חשוב לבדוק את הרישוי של הגוף המלווה, ולוודא שקיבלתם ליווי מקצועי לפני קבלת ההחלטה.
            </p>
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/muhni/schedule"
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-md transition duration-300 whitespace-nowrap max-w-[90vw] overflow-hidden text-ellipsis"
          >
            דברו עם יועץ למשכנתאות חוץ בנקאיות
          </Link>
        </div>
      </div>
    </div>
  );
}
