"use client";

import Image from "next/image";
import Link from "next/link";

export default function ReverseMortgage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-20 relative overflow-hidden bg-[#f4f6f9]">
      {/* שכבת רקע עם עומק עדין */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#edf1f5] via-[#f7f9fb] to-[#e8edf1]" />

      {/* שכבת אור רכה למראה תלת מימד */}
      <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-white/40 blur-3xl rounded-full opacity-40" />

      {/* קופסה מרכזית */}
      <div className="relative z-10 w-[90%] max-w-4xl bg-white/70 backdrop-blur-xl rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-10 md:p-14 transition-transform hover:-translate-y-1">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#1d75a1] text-center mb-6 leading-tight">
          משכנתא הפוכה – פתרון פיננסי לבני הגיל השלישי
        </h1>

        <p className="text-lg text-gray-700 leading-relaxed text-center mb-8">
          משכנתא הפוכה היא הלוואה ייחודית המאפשרת לבני 60 ומעלה לנצל את ערך הנכס שלהם לקבלת תזרים כספי חודשי
          או סכום חד־פעמי, ללא צורך בהחזר חודשי. מדובר בפתרון אידיאלי לשיפור איכות החיים בגיל הפרישה.
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

        {/* מקטעים תלת מימדיים */}
        <div className="space-y-8">
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-orange-600 mb-2">
              מהי משכנתא הפוכה?
            </h2>
            <p className="text-gray-700 leading-relaxed">
              משכנתא הפוכה היא הלוואה שבה בעל הנכס מקבל תשלומים מהבנק במקום לשלם החזרים חודשיים. 
              ההלוואה נפרעת רק כאשר בעל הנכס מוכר את הבית או לאחר פטירתו, אז היורשים יכולים לבחור 
              אם להחזיר את ההלוואה ולשמור על הנכס או למכור אותו.
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-blue-600 mb-2">
              למי מתאימה משכנתא הפוכה?
            </h2>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed">
              <li>בני 60 ומעלה שבבעלותם דירה או בית</li>
              <li>מי שמעוניין בהכנסה חודשית נוספת ללא מכירת הנכס</li>
              <li>מי שרוצה להעניק לילדים תמיכה כלכלית בזמן החיים</li>
              <li>מי שזקוק למימון לצרכים רפואיים, שיפוץ הבית או שיפור איכות החיים</li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-green-600 mb-2">
              היתרונות של משכנתא הפוכה
            </h2>
            <ul className="list-disc list-inside text-gray-700 leading-relaxed">
              <li>אין צורך בהחזר חודשי – התשלום מתבצע רק במכירת הנכס</li>
              <li>ניצול ערך הבית לקבלת תזרים כספי</li>
              <li>גמישות – ניתן לבחור בין סכום חד־פעמי לתשלומים חודשיים</li>
              <li>שיפור איכות החיים בגיל השלישי ללא מכירת הבית</li>
              <li>הגנה משפטית – הנכס נשאר בבעלות בעליו</li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <h2 className="text-2xl font-semibold text-purple-600 mb-2">
              תהליך קבלת משכנתא הפוכה
            </h2>
            <p className="text-gray-700 leading-relaxed">
              התהליך מתחיל בבדיקת שווי הנכס ובהתאמה אישית לצרכים הפיננסיים של הלקוח. 
              לאחר קבלת אישור עקרוני, נחתם הסכם מול הבנק והכסף מועבר בהתאם למסלול הנבחר. 
              אין צורך בתשלומי ריבית חודשיים, והחזר ההלוואה מתבצע בעת מכירת הנכס או לפי החלטת היורשים.
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
