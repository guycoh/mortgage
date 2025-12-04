"use client";

import Image from "next/image";
import Link from "next/link";
//import LoanCalculator from "../calculators/simple_calculator/page";
import BalloonLoanCalculator from "../calculators/baloon/BalloonLoanCalculator";



export default function BridgeLoan() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-20 relative overflow-hidden bg-[#f4f6f9]">
      {/* שכבת רקע עם עומק עדין */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#edf1f5] via-[#f7f9fb] to-[#e8edf1]" />

      {/* שכבת אור רכה למראה תלת מימד */}
      <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-white/40 blur-3xl rounded-full opacity-40" />

      <div className="relative z-10 w-[90%] max-w-4xl bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-10 md:p-14 transition-transform hover:-translate-y-1">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#1d75a1] text-center mb-6 leading-tight">
          הלוואת גישור – פתרון מימון חכם בין דירות
        </h1>

        <p className="text-lg text-gray-700 leading-relaxed text-center mb-8">
          הלוואת גישור היא הלוואה זמנית הניתנת לתקופה קצרה, עד למכירת נכס קיים או קבלת מקור מימון צפוי. היא מתאימה במיוחד
          למי שרוצה לקנות דירה חדשה לפני שמכר את הקיימת.
        </p>
       <BalloonLoanCalculator/>
{/* 
        <div className="flex justify-center mb-10">
          <Image
            src="/assets/images/imgFiles/bridgeLoan.png"
            alt="הלוואת גישור"
            width={500}
            height={300}
            className="rounded-xl shadow-lg"
          />
     

        </div> */}

        {/* מקטעים תלת מימדיים */}
        <div className="space-y-8">
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-orange-600 mb-2">
              מהי הלוואת גישור?
            </h2>
            <p className="text-gray-700 leading-relaxed">
              הלוואת גישור היא הלוואה לתקופה קצרה (עד שנתיים לרוב), המיועדת לגשר בין רכישת נכס לבין מועד קבלת כספים
              צפויים – לרוב ממכירת נכס אחר. כך תוכלו לרכוש דירה חדשה בלי להמתין למכירת הדירה הישנה.
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-blue-600 mb-2">
              למי מתאימה הלוואת גישור?
            </h2>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed">
              <li>למי שמכר דירה אך הכסף טרם התקבל בפועל</li>
              <li>למי שמצא דירה חדשה ורוצה לקנות לפני שמכר את הקיימת</li>
              <li>למשקיעים או רוכשים שמעוניינים לבצע עסקאות מהירות</li>
              <li>למי שממתין לקבלת ירושה או תשלום גדול אחר</li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-green-600 mb-2">
              היתרונות של הלוואת גישור
            </h2>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed">
              <li>מאפשרת רכישה מיידית של נכס</li>
              <li>גמישות בתזמון מכירת הדירה הנוכחית</li>
              <li>תנאי ריבית משתלמים במיוחד בטווח הקצר</li>
              <li>תכנון פיננסי חכם ומבוקר</li>
              <li>מניעת החמצת הזדמנות רכישה</li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-purple-600 mb-2">
              איך זה עובד בפועל?
            </h2>
            <p className="text-gray-700 leading-relaxed">
              נבצע בדיקה של שווי הדירה שבבעלותכם, נבחן את מקורות ההחזר העתידיים, נקבע סכום הלוואה מתאים ונתאים לכם מסלול
              קצר טווח עם החזר חודשי נמוך או ללא תשלום חודשי – לפי הצורך. בסיום התקופה, לאחר מכירת הדירה, ההלוואה תסולק.
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
