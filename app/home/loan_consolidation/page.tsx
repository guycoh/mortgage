"use client";

import Image from "next/image";
import FancyButton from "../components/FancyButton";

export default function LoanConsolidation() {
  return (
    <div className="font-open-sans font-normal min-h-screen flex flex-col items-center justify-start py-20 relative overflow-hidden bg-[#f4f6f9]">
      {/* שכבת רקע עם עומק עדין */}
      <div className="absolute inset-0 bg-linear-to-br from-[#edf1f5] via-[#f7f9fb] to-[#e8edf1]" />

      {/* שכבת אור רכה למראה תלת מימד */}
      <div className="absolute -top-37.5 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-white/40 blur-3xl rounded-full opacity-40" />

      {/* קופסה מרכזית */}
      <div className="font-open-sans font-normal relative z-10 w-[90%] max-w-4xl bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-10 md:p-14 transition-transform hover:-translate-y-1">

        <h1 className="font-open-sans font-normal text-4xl sm:text-4xl text-[#1d75a1] text-center mb-6 leading-tight">
          איחוד הלוואות – הפתרון ליציאה מחובות
        </h1>

        <p className="text-xl text-gray-900 leading-relaxed text-center mb-8">
          איחוד הלוואות מאפשר לכם לקחת מספר הלוואות קיימות ולהפוך אותן להלוואה אחת
          מסודרת עם החזר חודשי נוח יותר, ריבית נמוכה יותר ושליטה טובה יותר על התקציב.
          זהו פתרון פיננסי יעיל למי שמרגיש עומס מהתחייבויות קיימות ורוצה סדר כלכלי חדש.
        </p>

        <div className="flex justify-center mb-10">
          <Image
            src="/assets/images/imgFiles/loan_consolidation.jpg"
            alt="איחוד הלוואות"
            width={500}
            height={300}
            className="rounded-xl shadow-lg"
          />
        </div>

        {/* מקטעים */}
        <div className="font-open-sans font-normal space-y-8">

          <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-3xl font-semibold text-orange-600 mb-2">
              מהו איחוד הלוואות?
            </h2>

            <p className="text-xl text-gray-700 leading-relaxed">
              איחוד הלוואות הוא תהליך שבו מרכזים מספר התחייבויות פיננסיות להלוואה אחת,
              לרוב בתנאים טובים יותר הכוללים ריבית נמוכה יותר ופריסה נוחה יותר של התשלומים.
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-3xl font-semibold text-blue-600 mb-2">
              למי מתאים איחוד הלוואות?
            </h2>

            <ul className="text-xl list-disc list-outside pl-6 text-gray-700 leading-relaxed">
              <li>מי שמחזיק מספר הלוואות במקביל.</li>
              <li>מי שמתקשה לעמוד בהחזרים החודשיים.</li>
              <li>מי שמעוניין להפחית ריביות והוצאות מימון.</li>
              <li>מי שרוצה סדר ושליטה טובה יותר על התקציב.</li>
              <li>משקי בית עם עומס התחייבויות פיננסיות.</li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-3xl font-semibold text-green-600 mb-2">
              היתרונות של איחוד הלוואות
            </h2>

            <ul className="text-xl list-disc list-outside pl-6 text-gray-700 leading-relaxed">
              <li>החזר חודשי נמוך יותר.</li>
              <li>ריבית כוללת נמוכה יותר.</li>
              <li>ניהול פשוט של הלוואה אחת בלבד.</li>
              <li>שיפור התזרים החודשי.</li>
              <li>הפחתת לחץ כלכלי.</li>
              <li>אפשרות לאיזון כלכלי מחדש.</li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-3xl font-semibold text-purple-600 mb-2">
              איך מתבצע התהליך?
            </h2>

            <p className="text-xl text-gray-700 leading-relaxed">
              התהליך כולל מיפוי של כלל ההלוואות הקיימות, בדיקת תנאים פיננסיים,
              בניית מסלול הלוואה חדש ואישור מול גוף מימון או בנק.
              לאחר מכן מתבצע סילוק ההלוואות הישנות והחלפה בהלוואה אחת מסודרת.
              מומלץ לבצע את התהליך בליווי מקצועי כדי למקסם חיסכון.
            </p>
          </div>

        </div>

        {/* CTA */}
        <div className="font-open-sans font-normal mt-8 flex justify-center items-center gap-6 flex-wrap">
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