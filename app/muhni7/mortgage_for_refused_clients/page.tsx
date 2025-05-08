"use client"
import Image from "next/image";
import Link from "next/link";

export default function MortgageForRefusedClients() {
  return (
    <div className="bg-gray-50 min-h-screen py-12 px-6 sm:px-12 md:px-20">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl p-8 sm:p-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 text-center mb-6">
          משכנתא למסורבים – גם כשאמרו לכם לא, אנחנו אומרים כן
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed text-center mb-6">
          קיבלתם סירוב מהבנק? זה לא הסוף! אנו מתמחים בפתרונות מימון מותאמים אישית למי שנתקל בקשיים בקבלת משכנתא.
          בעזרת ניסיון רב והיכרות מעמיקה עם שוק האשראי – נוכל לבנות עבורכם מסלול אפשרי גם במצבים מורכבים.
        </p>
        <Image
          src="/assets/images/imgFiles/mortgage_refused_clients.jpg"
          alt="משכנתא למסורבים"
          width={400}
          height={200}
          className="rounded-xl mx-auto"
        />
        <div className="mt-8 space-y-6">
          <div className="bg-red-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-red-600">למה מסרבים למשכנתא?</h2>
            <ul className="list-disc list-inside text-gray-700 mt-2">
              <li>בעיות בעבר עם החזר הלוואות או דירוג אשראי נמוך</li>
              <li>הכנסה לא מספקת או אי יציבות תעסוקתית</li>
              <li>חובות קיימים מול הבנקים או גורמים חוץ בנקאיים</li>
              <li>עיכובים או היסטוריה פיננסית בעייתית</li>
            </ul>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-yellow-600">איך אנחנו יכולים לעזור?</h2>
            <p className="text-gray-700 mt-2">
              אנחנו בוחנים את התמונה המלאה, פועלים מול מגוון בנקים וגופים חוץ בנקאיים, ויוצרים עבורכם פתרון שמתאים למצבכם.
              לא מוותרים עליכם – אלא מוצאים את הדרך הנכונה.
            </p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-green-600">למי זה מתאים?</h2>
            <p className="text-gray-700 mt-2">
              אם סורבתם בעבר, אם הבנק מקשה עליכם, או אם יש לכם רקע פיננסי מורכב – אנחנו כאן כדי להילחם עבורכם על המשכנתא
              שמגיעה לכם.
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
