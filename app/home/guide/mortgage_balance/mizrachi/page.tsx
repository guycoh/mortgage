"use client";
import Phone from "@/public/assets/images/svg/phone";
import WebIcon from "@/public/assets/images/svg/webIcon";
import Image from "next/image";

export default function MortgageClearanceInstructions() {
 
  const steps = [
  
    "הלוואות ומשכנתאות",
    "המשכנתא שלי",
    "בקשות וטפסים",
    "הפקת אישורים",
    "הפקת אישור יתרות",
  ];

 
  return (
    <div className=" font-open-sans font-normal max-w-4xl mx-auto my-32 p-6 space-y-8">
      <h1 className="text-3xl font-bold text-center text-gray-900">
        איך מזמינים אישור יתרות לסילוק?
      </h1>

      {/* מקטע מאוחד */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-[#F97316]/40 overflow-hidden">
        {/* חלק 1 - דרך אתר הבנק */}
        <div className="relative p-6">
          <div className="absolute left-1 top-1">
            <Image
              src="/assets/images/imgFiles/mizrachi.png"
              alt="leumi"
              width={120}
              height={60}
              className="rounded-xl mx-auto"
            />
          </div>

          {/* טקסט מתחיל מתחת ללוגו */}
          <div className="flex items-center gap-3 mb-4 mt-20">
            <WebIcon className="h-6 w-6 text-[#F97316]" />
            <h2 className="text-xl font-semibold text-gray-700">1. דרך אתר הבנק</h2>
          </div>
          <div className="text-gray-700 space-y-2 leading-relaxed">
            <p>
              <span className="font-medium">אם ברשותכם גם חשבון עו"ש בבנק – </span>
              <a
                href="https://www.mizrahi-tefahot.co.il/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 font-bold hover:underline"
              >
                לחצו כאן
              </a>
            </p>
         
         {/* כותרת */}
         <div className="bg-gray-100 rounded-lg p-4 w-fit text-right shadow-sm" >
      
             {/* כותרת */}
              <p className="font-bold text-gray-900 mb-3">
                כניסה לחשבון הזינו פרטי כניסה
              </p>

              {/* רשימה מדורגת עם מדרגות */}
              <ol className="list-decimal pr-6 space-y-1 text-gray-800">
                {steps.map((step, index) => (
                  <li
                    key={index}
                    style={{ marginRight: `${index * 12}px` }} // מדרגות
                  >
                    <span className="inline-flex items-center gap-1">
                      <span>↩</span>
                      <span>{step}</span>
                    </span>
                  </li>
                ))}
              </ol>
          </div>
            <p className="pt-4">
              <span className="font-medium">אם ברשותכם רק משכנתא בבנק –</span>
              <br />
              נכנסים לקישור{" "}
              <a
                href="https://sc.mizrahi-tefahot.co.il/TFHLogin/index.html#/login"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 font-bold hover:underline"
              >
                כניסה ללקוחות טפחות
              </a>{" "}
              באתר או באפליקציה. <br />
              לאחר הזנת נתוני הזיהוי, יתקבל קוד כניסה חד פעמי לטלפון הנייד – יש להזין אותו במקום הדרוש.
            </p>
          </div>
        </div>

        {/* קו הפרדה כתום אסתטי */}
        <div className="h-px bg-[#F97316]/40 mx-6" />

        {/* חלק 2 - דרך המוקד */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Phone className="h-6 w-6 text-[#F97316]" />
            <h2 className="text-xl font-semibold text-gray-700">2. דרך המוקד הטלפוני</h2>
          </div>
          <ul className="list-disc list-inside text-gray-700 space-y-1 leading-relaxed">
            <li>
              טלפון:{" "}
              <a href="tel:*8860" className="font-bold text-[#F97316] hover:underline">
                *8860
              </a>
            </li>
            <li>המרכז פעיל בימים א'–ה' בין השעות 08:00–18:30</li>
            <li>ביום ו' בשעות 08:00–13:00</li>
          </ul>

         </div>
      </div>
    </div>
  );
}
