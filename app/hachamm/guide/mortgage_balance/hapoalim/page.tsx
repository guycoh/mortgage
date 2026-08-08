"use client";
import Phone from "@/public/assets/images/svg/phone";
import WebIcon from "@/public/assets/images/svg/webIcon";
import Image from "next/image";
import WhatsAppButton from "@/app/home/components/WhatsAppButton";
import PdfUploadForm from "@/app/home/components/PdfUploadForm";




export default function MortgageClearanceInstructions() {
  return (

   <>
   <div className="max-w-4xl mx-auto p-6 space-y-8 font-open-sans font-normal">
  <h1 className="text-3xl font-bold text-center mt-16 text-gray-800">
    איך מזמינים אישור יתרות לסילוק?
  </h1>

  {/* כרטיס מרכזי */}
  <div className="bg-white rounded-2xl shadow-lg border-2 border-red-500/30 overflow-hidden">

    {/* חלק 1 - אתר הבנק */}
    <div className="relative p-6">

      {/* לוגו */}
      <div className="absolute left-1 top-1">
        <Image
          src="/assets/images/imgFiles/hapoalim.png"
          alt="poalim"
          width={240}
          height={120}
          className="rounded-xl mx-auto"
        />
      </div>

      <div className="mt-20">

        <div className="flex items-center gap-3 mb-4">
          <WebIcon className="h-6 w-6 text-red-600" />
          <h2 className="text-xl font-semibold text-gray-700">
            1. דרך אתר הבנק
          </h2>
        </div>

        <div className="mb-4 text-gray-700">
          <span className="font-medium">
            ניתן לקבל את הדוח באתר הבנק רק במידה וקיים ברשותכם קוד משתמש וסיסמא,
            וחשבון העו״ש שלכם מתנהל גם בפועלים.
          </span>{" "}
          <a
            href="https://www.bankhapoalim.co.il/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 font-medium hover:underline"
          >
            <strong>לוחצים כאן</strong>
          </a>
        </div>

        {/* שלבים עם חיצים */}
        <div className="text-gray-700 leading-relaxed space-y-2 pr-2">

          <div className="font-semibold">הזינו שם משתמש וסיסמא </div>

          <div className="flex items-center gap-2 pr-2">
            <span className="text-red-600 text-2xl font-bold inline-block">
              &#8629;
            </span>
            <span>הלוואות ומשכנתא </span>
          </div>

          <div className="flex items-center gap-2 pr-6">
            <span className="text-red-600 text-2xl font-bold inline-block">
              &#8629;
            </span>
            <span>פעולות במשכנתא</span>
          </div>

          <div className="flex items-center gap-2 pr-10">
            <span className="text-red-600 text-2xl font-bold inline-block">
              &#8629;
            </span>
            <span>הפקת דוחות</span>
          </div>

          <div className="flex items-center gap-2 pr-14">
            <span className="text-red-600 text-2xl font-bold inline-block">
              &#8629;
            </span>
            <span>דו”ח פרטי משכנתאות </span>
          </div>

          <div className="pt-4 font-medium">
          מיד תקבלו את הדוח בקובץ להדפסה או לשמירה במחשב
          </div>
        </div>
      </div>
    </div>

    {/* קו הפרדה */}
    <div className="h-px bg-red-300 mx-6" />

    {/* חלק 2 - מוקד טלפוני */}
    <div className="relative p-6">

      <div className="absolute left-1 bottom-1">
{/* 
        <WhatsAppButton /> */}

      </div>

      <div className="flex items-center gap-3 mb-4">
        <Phone className="h-6 w-6 text-red-600" />
        <h2 className="text-xl font-semibold text-gray-700">
          2. דרך המוקד הטלפוני
        </h2>
      </div>

      <ul className="list-disc list-inside text-gray-700 space-y-1 leading-relaxed">
        <li>
          טלפון:{" "}
          <a href="tel:*2401" className="font-medium text-blue-600 hover:underline">
            *2401
          </a>
        </li>
        <li>המוקד פעיל בימים א'–ה'</li>
        <li>שעות פעילות: 08:00–16:00</li>
      </ul>
    </div>
<PdfUploadForm/>

  </div>
</div>
   
   
   </>


  );
}





