"use client";

import Image from "next/image";
import Link from "next/link";
import BalloonLoanCalculator from "../calculators/baloon/BalloonLoanCalculator";
import FancyButton from "../components/FancyButton";


export default function BridgeLoan() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-20 relative overflow-hidden bg-[#f4f6f9]">
      {/* שכבת רקע עם עומק עדין */}
      <div className="absolute inset-0 bg-linear-to-br from-[#edf1f5] via-[#f7f9fb] to-[#e8edf1]" />

      {/* שכבת אור רכה למראה תלת מימד */}
      <div className="absolute -top-37.5 left-1/2 -translate-x-1/2 w-300 h-150 bg-white/40 blur-3xl rounded-full opacity-40" />

      <div className="relative z-10 w-[90%] max-w-4xl bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-10 md:p-14 transition-transform hover:-translate-y-1">
        <h1 className="font-open-sans font-normal  text-3xl sm:text-4xl  text-[#1d75a1] text-center mb-6 leading-tight">
          הלוואת גישור – פתרון מימון חכם בין דירות
        </h1>

        <p className="font-open-sans font-normal  text-lg text-gray-700 leading-relaxed text-center mb-8">
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
          <div className="bg-linear-to-r from-orange-50 to-orange-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-open-sans font-normal text-orange-600 mb-2">
              מהי הלוואת גישור?
            </h2>
            <p className=" font-open-sans font-normal  text-gray-700 leading-relaxed">
              הלוואת גישור היא הלוואה לתקופה קצרה (עד שנתיים לרוב), המיועדת לגשר בין רכישת נכס לבין מועד קבלת כספים
              צפויים – לרוב ממכירת נכס אחר. כך תוכלו לרכוש דירה חדשה בלי להמתין למכירת הדירה הישנה.
            </p>
          </div>

          <div className="bg-linear-to-r from-blue-50 to-blue-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-open-sans font-normal text-blue-600 mb-2">
              למי מתאימה הלוואת גישור?
            </h2>
            <ul className="font-open-sans font-normal  list-disc list-inside text-gray-700 leading-relaxed">
              <li>למי שמכר דירה אך הכסף טרם התקבל בפועל</li>
              <li>למי שמצא דירה חדשה ורוצה לקנות לפני שמכר את הקיימת</li>
              <li>למשקיעים או רוכשים שמעוניינים לבצע עסקאות מהירות</li>
              <li>למי שממתין לקבלת ירושה או תשלום גדול אחר</li>
            </ul>
          </div>

          <div className="bg-linear-to-r from-green-50 to-green-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-open-sans font-normal text-green-600 mb-2">
              היתרונות של הלוואת גישור
            </h2>
            <ul className="font-open-sans font-normal  list-disc list-inside text-gray-700 leading-relaxed">
              <li>מאפשרת רכישה מיידית של נכס</li>
              <li>גמישות בתזמון מכירת הדירה הנוכחית</li>
              <li>תנאי ריבית משתלמים במיוחד בטווח הקצר</li>
              <li>תכנון פיננסי חכם ומבוקר</li>
              <li>מניעת החמצת הזדמנות רכישה</li>
            </ul>
          </div>

          <div className="bg-linear-to-r from-purple-50 to-purple-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-open-sans font-normal text-purple-600 mb-2">
              איך זה עובד בפועל?
            </h2>
            <p className="font-open-sans font-normal text-gray-700 leading-relaxed">
              נבצע בדיקה של שווי הדירה שבבעלותכם, נבחן את מקורות ההחזר העתידיים, נקבע סכום הלוואה מתאים ונתאים לכם מסלול
              קצר טווח עם החזר חודשי נמוך או ללא תשלום חודשי – לפי הצורך. בסיום התקופה, לאחר מכירת הדירה, ההלוואה תסולק.
            </p>
          </div>
        </div>

        {/* קריאה לפעולה */}   
        <div className="font-open-sans font-normal mt-4 text-5xl  flex justify-center items-center gap-6 flex-wrap">
            <FancyButton
              href="/home/contact"
              text="השאר פרטים"
              hoverText="צור קשר"
            />

            <FancyButton
              href="/home/schedule"
              text="תיאום זום עם יועץ"
              hoverText="קבע פגישה"
            />
        </div>

      </div>
    </div>
  );
}
