"use client";

import Image from "next/image";
import FancyButton from "../components/FancyButton";

export default function ReverseMortgage() {
  return (
    <div className="font-open-sans font-normal min-h-screen flex flex-col items-center justify-start py-20 relative overflow-hidden bg-[#f4f6f9]">
      {/* שכבת רקע עם עומק עדין */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#edf1f5] via-[#f7f9fb] to-[#e8edf1]" />

      {/* שכבת אור רכה למראה תלת מימד */}
      <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-white/40 blur-3xl rounded-full opacity-40" />

      {/* קופסה מרכזית */}
      <div className="font-open-sans font-normal relative z-10 w-[90%] max-w-4xl bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-10 md:p-14 transition-transform hover:-translate-y-1">

        <h1 className="font-open-sans font-normal text-4xl sm:text-4xl text-[#1d75a1] text-center mb-6 leading-tight">
          משכנתא הפוכה – פתרון פיננסי לבני הגיל השלישי
        </h1>

        <p className="text-xl text-gray-900 leading-relaxed text-center mb-8">
          משכנתא הפוכה היא הלוואה ייחודית המאפשרת לבני 55 ומעלה לנצל את שווי
          הנכס שברשותם ולקבל מימון מבלי למכור את הבית ומבלי לשלם החזר חודשי.
          מדובר בפתרון המאפשר לשפר את איכות החיים, לקבל הכנסה נוספת ולשמור
          על הבעלות בנכס לאורך כל תקופת ההלוואה.
        </p>

        <div className="flex justify-center mb-10">
          <Image
            src="/assets/images/imgFiles/reverse_mortgage.jpg"
            alt="משכנתא הפוכה"
            width={500}
            height={300}
            className="rounded-xl shadow-lg"
          />
        </div>

        {/* מקטעים */}
        <div className="font-open-sans font-normal space-y-8">

          <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-3xl font-semibold text-orange-600 mb-2">
              מהי משכנתא הפוכה?
            </h2>

            <p className="text-xl text-gray-700 leading-relaxed">
              משכנתא הפוכה היא הלוואה המיועדת לבעלי נכסים בגיל מבוגר,
              במסגרתה הבנק או הגוף המממן מעניקים כסף כנגד שיעבוד הנכס.
              בשונה ממשכנתא רגילה, אין צורך בהחזרים חודשיים, והחוב נפרע
              בדרך כלל רק במכירת הנכס או לאחר פטירת הלווים.
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-3xl font-semibold text-blue-600 mb-2">
              למי מתאימה משכנתא הפוכה?
            </h2>

            <ul className="text-xl list-disc list-outside pl-6 text-gray-700 leading-relaxed">
              <li>בני 55 ומעלה שבבעלותם דירה או בית.</li>
              <li>מי שמעוניין בהכנסה חודשית נוספת ללא מכירת הנכס.</li>
              <li>מי שרוצה לסייע לילדיו כלכלית במהלך חייו.</li>
              <li>מי שזקוק למימון עבור צרכים רפואיים.</li>
              <li>מי שמעוניין לשפץ את הבית או לשפר את איכות החיים.</li>
              <li>פנסיונרים המעוניינים לחזק את הביטחון הכלכלי שלהם.</li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-3xl font-semibold text-green-600 mb-2">
              היתרונות של משכנתא הפוכה
            </h2>

            <ul className="text-xl list-disc list-outside pl-6 text-gray-700 leading-relaxed">
              <li>ללא החזר חודשי לאורך חיי ההלוואה.</li>
              <li>אפשרות לקבל סכום חד־פעמי או תשלומים חודשיים.</li>
              <li>שמירה על הבעלות בנכס.</li>
              <li>שיפור תזרים המזומנים בגיל הפרישה.</li>
              <li>גמישות בהתאמת מסלול המימון לצרכים האישיים.</li>
              <li>פתרון נוח למימון הוצאות גדולות ללא מכירת הבית.</li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-3xl font-semibold text-purple-600 mb-2">
              תהליך קבלת משכנתא הפוכה
            </h2>

            <p className="text-xl text-gray-700 leading-relaxed">
              התהליך כולל הערכת שווי הנכס, בדיקת זכאות והתאמת מסלול המימון
              לצרכים האישיים של הלקוח. לאחר אישור הבקשה וחתימה על המסמכים,
              הכספים מועברים בהתאם למסלול שנבחר. לאורך כל התקופה ממשיכים
              להתגורר בנכס כרגיל וליהנות מהבעלות עליו.
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