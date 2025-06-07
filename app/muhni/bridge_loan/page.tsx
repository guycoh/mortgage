"use client"

import Image from "next/image";
import Link from "next/link";

export default function BridgeLoan() {
  return (
    <div className="bg-galbg min-h-screen py-12 px-6 sm:px-12 md:px-20">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl p-8 sm:p-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 text-center mb-6">
          הלוואת גישור – פתרון מימון חכם בין דירות
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed text-center mb-6">
          הלוואת גישור היא הלוואה זמנית הניתנת לתקופה קצרה, עד למכירת נכס קיים או קבלת מקור מימון צפוי. היא מתאימה במיוחד
          למי שרוצה לקנות דירה חדשה לפני שמכר את הקיימת.
        </p>
        <Image
          src="/assets/images/imgFiles/bridgeLoan.png"
          alt="הלוואת גישור"
          width={400}
          height={200}
          className="rounded-xl mx-auto"
        />
        <div className="mt-8 space-y-6">
          <div className="bg-orange-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-orange-600">מהי הלוואת גישור?</h2>
            <p className="text-gray-700 mt-2">
              הלוואת גישור היא הלוואה לתקופה קצרה (עד שנתיים לרוב), המיועדת לגשר בין רכישת נכס לבין מועד קבלת כספים
              צפויים – לרוב ממכירת נכס אחר. כך תוכלו לרכוש דירה חדשה בלי להמתין למכירת הדירה הישנה.
            </p>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-blue-600">למי מתאימה הלוואת גישור?</h2>
            <ul className="list-disc list-inside text-gray-700 mt-2">
              <li>למי שמכר דירה אך הכסף טרם התקבל בפועל</li>
              <li>למי שמצא דירה חדשה ורוצה לקנות לפני שמכר את הקיימת</li>
              <li>למשקיעים או רוכשים שמעוניינים לבצע עסקאות מהירות</li>
              <li>למי שממתין לקבלת ירושה או תשלום גדול אחר</li>
            </ul>
          </div>
          <div className="bg-green-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-green-600">היתרונות של הלוואת גישור</h2>
            <ul className="list-disc list-inside text-gray-700 mt-2">
              <li>מאפשרת רכישה מיידית של נכס</li>
              <li>גמישות בתזמון מכירת הדירה הנוכחית</li>
              <li>תנאי ריבית משתלמים במיוחד בטווח הקצר</li>
              <li>תכנון פיננסי חכם ומבוקר</li>
              <li>מניעת החמצת הזדמנות רכישה</li>
            </ul>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-purple-600">איך זה עובד בפועל?</h2>
            <p className="text-gray-700 mt-2">
              נבצע בדיקה של שווי הדירה שבבעלותכם, נבחן את מקורות ההחזר העתידיים, נקבע סכום הלוואה מתאים ונתאים לכם מסלול
              קצר טווח עם החזר חודשי נמוך או ללא תשלום חודשי – לפי הצורך. בסיום התקופה, לאחר מכירת הדירה, ההלוואה תסולק.
            </p>
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/muhni/schedule"
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-md transition duration-300 whitespace-nowrap max-w-[90vw] overflow-hidden text-ellipsis"
          >
            קבעו פגישה עם מומחה למשכנתאות
          </Link>
        </div>
      </div>
    </div>
  );
}
