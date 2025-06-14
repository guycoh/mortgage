"use client"

import Image from "next/image";
import Link from "next/link";

export default function ReverseMortgage() {
  return (
    <div className="bg-galbg min-h-screen py-12 px-6 sm:px-12 md:px-20">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl p-8 sm:p-12">
        <div className="animate-tracking-in-expand-fwd text-3xl sm:text-4xl font-bold text-gray-800 text-center mb-6">
          משכנתא הפוכה - פתרון פיננסי לבני הגיל השלישי
        </div>
        <p className="text-lg text-gray-600 leading-relaxed text-center mb-6">
          משכנתא הפוכה היא הלוואה ייחודית המאפשרת לבני 60 ומעלה לנצל את ערך הנכס שלהם לקבלת תזרים כספי חודשי
          או סכום חד-פעמי, ללא צורך בהחזר חודשי. מדובר בפתרון אידיאלי לשיפור איכות החיים בגיל הפרישה.
        </p>
        <Image
          src="/assets/images/imgFiles/reverse_mortgage.jpg"
          alt="משכנתא הפוכה"
          width={400}
          height={200}
          className="rounded-xl mx-auto"
        />
        <div className="mt-8 space-y-6">
          <div className="bg-orange-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-orange-600">מהי משכנתא הפוכה?</h2>
            <p className="text-gray-700 mt-2">
              משכנתא הפוכה היא הלוואה שבה בעל הנכס מקבל תשלומים מהבנק במקום לשלם החזרים חודשיים. ההלוואה נפרעת רק כאשר
              בעל הנכס מוכר את הבית או לאחר פטירתו, אז היורשים יכולים להחליט האם להחזיר את ההלוואה ולשמור על הנכס או למכור אותו.
            </p>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-blue-600">למי מתאימה משכנתא הפוכה?</h2>
            <ul className="list-disc list-inside text-gray-700 mt-2">
              <li>בני 60 ומעלה שבבעלותם דירה או בית</li>
              <li>מי שמעוניין בהכנסה חודשית נוספת ללא מכירת הנכס</li>
              <li>מי שרוצה להעניק לילדים תמיכה כלכלית בזמן החיים</li>
              <li>מי שזקוק למימון לצרכים רפואיים, שיפוץ הבית או שיפור איכות החיים</li>
            </ul>
          </div>
          <div className="bg-green-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-green-600">היתרונות של משכנתא הפוכה</h2>
            <ul className="list-disc list-inside text-gray-700 mt-2">
              <li>אין צורך בהחזר חודשי - התשלום מתבצע רק במכירת הנכס</li>
              <li>ניצול ערך הבית לקבלת תזרים כספי</li>
              <li>גמישות - ניתן לבחור בין קבלת סכום חד-פעמי או תשלומים חודשיים</li>
              <li>שיפור איכות החיים בגיל השלישי ללא מכירת הבית</li>
              <li>הגנה משפטית על בעל הנכס - הנכס נשאר בבעלותו</li>
            </ul>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-purple-600">תהליך קבלת משכנתא הפוכה</h2>
            <p className="text-gray-700 mt-2">
              התהליך מתחיל בבדיקת שווי הנכס והתאמה אישית לצרכים הפיננסיים של הלקוח. לאחר קבלת אישור עקרוני, נחתם הסכם מול
              הבנק והכסף מועבר בהתאם למסלול הנבחר. אין צורך בתשלומי ריבית חודשיים, והחזר ההלוואה מתבצע בעת מכירת הנכס או
              לפי החלטת היורשים.
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
