"use client"
import Image from "next/image";
import Link from "next/link";

export default function MortgageForAnyPurpose() {
  return (
    <div className="bg-gray-50 min-h-screen py-12 px-6 sm:px-12 md:px-20">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl p-8 sm:p-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 text-center mb-6">
          משכנתא לכל מטרה - פתרון פיננסי חכם לצרכים שלכם
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed text-center mb-6">
          משכנתא לכל מטרה מאפשרת לכם לקבל מימון בתנאים נוחים כנגד נכס קיים. ניתן להשתמש בכסף למגוון רחב של מטרות,
          כגון שיפוץ הבית, סגירת חובות, השקעות או כל צורך פיננסי אחר.
        </p>
        <Image
          src="/assets/images/imgFiles/mortgage_any_purpose.jpg"
          alt="משכנתא לכל מטרה"
          width={400}
          height={200}
          className="rounded-xl mx-auto"
        />
        <div className="mt-8 space-y-6">
          <div className="bg-orange-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-orange-600">למה לקחת משכנתא לכל מטרה?</h2>
            <ul className="list-disc list-inside text-gray-700 mt-2">
              <li>מימון הוצאות בלתי צפויות</li>
              <li>שיפוץ ושדרוג הבית</li>
              <li>סגירת הלוואות קיימות בריביות גבוהות</li>
              <li>השקעה בעסק או ברכישת נכס נוסף</li>
              <li>מימון לימודים או חתונה</li>
            </ul>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-blue-600">איך מקבלים משכנתא לכל מטרה?</h2>
            <p className="text-gray-700 mt-2">
              התהליך כולל בדיקת שווי הנכס, אישור מסגרת אשראי מול הבנק, חתימה על תנאי ההלוואה וקבלת הכסף תוך זמן קצר.
              אנו נלווה אתכם לכל אורך הדרך כדי להבטיח שתקבלו את התנאים הטובים ביותר.
            </p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-green-600">למי זה מתאים?</h2>
            <p className="text-gray-700 mt-2">
              אם יש בבעלותכם נכס קיים ואתם זקוקים למימון נוסף לצורך אישי או עסקי – משכנתא לכל מטרה יכולה להיות פתרון
              משתלם וגמיש עבורכם.
            </p>
          </div>
        </div>
        <div className="text-center mt-10">
          <Link href="/home/schedule" className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-md transition duration-300">
              קבעו פגישה עם מומחה למשכנתאות
          </Link>
        </div>
      </div>
    </div>
  );
}






