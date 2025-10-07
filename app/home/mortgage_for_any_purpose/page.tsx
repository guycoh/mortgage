"use client";

import Image from "next/image";
import Link from "next/link";

export default function MortgageForAnyPurpose() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-20 relative overflow-hidden bg-[#f4f6f9]">
      {/* שכבת רקע עם עומק עדין */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#edf1f5] via-[#f7f9fb] to-[#e8edf1]" />

      {/* שכבת אור רכה למראה תלת מימד */}
      <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-white/40 blur-3xl rounded-full opacity-40" />

      <div className="relative z-10 w-[90%] max-w-4xl bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-10 md:p-14 transition-transform hover:-translate-y-1">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#1d75a1] text-center mb-6 leading-tight">
          משכנתא לכל מטרה – פתרון פיננסי חכם לצרכים שלכם
        </h1>

        <p className="text-lg text-gray-700 leading-relaxed text-center mb-8">
          משכנתא לכל מטרה מאפשרת לכם לקבל מימון בתנאים נוחים כנגד נכס קיים.
          ניתן להשתמש בכסף למגוון רחב של מטרות — שיפוץ הבית, סגירת חובות,
          השקעות, או כל צורך פיננסי אחר.
        </p>

        <div className="flex justify-center mb-10">
          <Image
            src="/assets/images/imgFiles/mortgage_any_purpose.jpg"
            alt="משכנתא לכל מטרה"
            width={500}
            height={300}
            className="rounded-xl shadow-lg"
          />
        </div>

        {/* מקטעים תלת מימדיים */}
        <div className="space-y-8">
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-orange-600 mb-2">
              למה לקחת משכנתא לכל מטרה?
            </h2>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed">
              <li>מימון הוצאות בלתי צפויות</li>
              <li>שיפוץ ושדרוג הבית</li>
              <li>סגירת הלוואות קיימות בריביות גבוהות</li>
              <li>השקעה בעסק או ברכישת נכס נוסף</li>
              <li>מימון לימודים או חתונה</li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-blue-600 mb-2">
              איך מקבלים משכנתא לכל מטרה?
            </h2>
            <p className="text-gray-700 leading-relaxed">
              התהליך כולל בדיקת שווי הנכס, אישור מסגרת אשראי מול הבנק,
              חתימה על תנאי ההלוואה וקבלת הכסף תוך זמן קצר.
              אנו נלווה אתכם לאורך כל הדרך כדי לוודא שתקבלו את התנאים הטובים ביותר.
            </p>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-green-600 mb-2">
              למי זה מתאים?
            </h2>
            <p className="text-gray-700 leading-relaxed">
              אם יש בבעלותכם נכס קיים ואתם זקוקים למימון נוסף לצורך אישי או עסקי –
              משכנתא לכל מטרה יכולה להיות פתרון משתלם, גמיש ויעיל במיוחד עבורכם.
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













// "use client"

// import Image from "next/image";
// import Link from "next/link";

// export default function MortgageForAnyPurpose() {
//   return (
//     <div className="bg-galbg min-h-screen py-12 px-6 sm:px-12 md:px-20">
//       <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl p-8 sm:p-12">
//        <div className="animate-tracking-in-expand-fwd text-3xl sm:text-4xl font-bold text-gray-800 text-center mb-6">
//         משכנתא לכל מטרה - פתרון פיננסי חכם לצרכים שלכם
//         </div>     
//         <p className="text-lg text-gray-600 leading-relaxed text-center mb-6">
//           משכנתא לכל מטרה מאפשרת לכם לקבל מימון בתנאים נוחים כנגד נכס קיים. ניתן להשתמש בכסף למגוון רחב של מטרות,
//           כגון שיפוץ הבית, סגירת חובות, השקעות או כל צורך פיננסי אחר.
//         </p>
//         <Image
//           src="/assets/images/imgFiles/mortgage_any_purpose.jpg"
//           alt="משכנתא לכל מטרה"
//           width={400}
//           height={200}
//           className="rounded-xl mx-auto"
//         />
//         <div className="mt-8 space-y-6">
//           <div className="bg-orange-100 p-4 rounded-lg shadow-md">
//             <h2 className="text-2xl font-semibold text-orange-600">למה לקחת משכנתא לכל מטרה?</h2>
//             <ul className="list-disc list-inside text-gray-700 mt-2">
//               <li>מימון הוצאות בלתי צפויות</li>
//               <li>שיפוץ ושדרוג הבית</li>
//               <li>סגירת הלוואות קיימות בריביות גבוהות</li>
//               <li>השקעה בעסק או ברכישת נכס נוסף</li>
//               <li>מימון לימודים או חתונה</li>
//             </ul>
//           </div>
//           <div className="bg-blue-100 p-4 rounded-lg shadow-md">
//             <h2 className="text-2xl font-semibold text-blue-600">איך מקבלים משכנתא לכל מטרה?</h2>
//             <p className="text-gray-700 mt-2">
//               התהליך כולל בדיקת שווי הנכס, אישור מסגרת אשראי מול הבנק, חתימה על תנאי ההלוואה וקבלת הכסף תוך זמן קצר.
//               אנו נלווה אתכם לכל אורך הדרך כדי להבטיח שתקבלו את התנאים הטובים ביותר.
//             </p>
//           </div>
//           <div className="bg-green-100 p-4 rounded-lg shadow-md">
//             <h2 className="text-2xl font-semibold text-green-600">למי זה מתאים?</h2>
//             <p className="text-gray-700 mt-2">
//               אם יש בבעלותכם נכס קיים ואתם זקוקים למימון נוסף לצורך אישי או עסקי – משכנתא לכל מטרה יכולה להיות פתרון
//               משתלם וגמיש עבורכם.
//             </p>
//           </div>
//         </div>
        
//         <div className="mt-10 flex justify-center">
//           <Link
//             href="/muhni/schedule"
//             className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-md transition duration-300 whitespace-nowrap max-w-[90vw] overflow-hidden text-ellipsis"
//           >
//             קבעו פגישה עם מומחה למשכנתאות
//           </Link>
//         </div>
//       </div>
//     </div>
//   );
// }






