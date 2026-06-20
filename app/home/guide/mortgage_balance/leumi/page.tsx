"use client";
import Phone from "@/public/assets/images/svg/phone";
import WebIcon from "@/public/assets/images/svg/webIcon";
import Image from "next/image";
import WhatsAppButton from "@/app/home/components/WhatsAppButton";
import PdfUploadForm from "@/app/home/components/PdfUploadForm";



export default function MortgageClearanceInstructions() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 font-open-sans font-normal ">
      <h1 className="text-3xl font-bold text-center mt-16 text-gray-800">
        איך מזמינים אישור יתרות לסילוק?
      </h1>

      {/* מקטע מאוחד */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-[#0078BE]/30 overflow-hidden">
        {/* חלק 1 - דרך אתר הבנק */}
        <div className="relative p-6">
          <div className="absolute left-1 top-1">
            <Image
              src="/assets/images/imgFiles/leumi.png"
              alt="leumi"
              width={120}
              height={60}
              className="rounded-xl mx-auto"
            />
          </div>
          <div className="mt-20"> {/* מרווח כדי להוריד את הטקסט מתחת ללוגו */}
          <div className="flex items-center gap-3 mb-4">
            <WebIcon className="h-6 w-6 text-[#0078BE]" />
            <h2 className="text-xl font-semibold text-gray-700">1. דרך אתר הבנק</h2>
          </div>
          <div className="mb-4 text-gray-700">
            <span className="font-medium">
              במידה ויש ברשותכם את פרטי הכניסה (שם משתמש וסיסמה),
            </span>{" "}
            <a
              href="https://hb2.bankleumi.co.il/staticcontent/gate-keeper/he/?trackingCode=742f6fb3-50a8-4d25-52c9-98a3de133a6b&sysNum=23&langNum=1"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0078BE] font-medium cursor-pointer hover:underline"
            >
              <strong>לחצו כאן</strong>
            </a>
          </div>
        {/* מסלול הוצאת דוח */}
          <div className="text-gray-700 leading-relaxed space-y-2 pr-2">

            <div className="font-semibold">
              הזינו את פרטי הכניסה
            </div>

            <div className="flex items-center gap-2 pr-2">
              <span className="text-[#0078BE] text-2xl font-bold inline-block ">
               &#8629;
              </span>
              <span>תפריט</span>
            </div>

            <div className="flex items-center gap-2 pr-6">
              <span className="text-[#0078BE] text-2xl font-bold inline-block ">
               &#8629;
              </span>
              <span>הלוואות ומשכנתאות</span>
            </div>

            <div className="flex items-center gap-2 pr-10">
               <span className="text-[#0078BE] text-2xl font-bold inline-block ">
                &#8629;
               </span>
              <span>הזמנת מסמכי משכנתאות</span>
            </div>

            <div className="flex items-center gap-2 pr-14">
               <span className="text-[#0078BE] text-2xl font-bold inline-block ">
               &#8629;
               </span>
              <span>אישור יתרות לסילוק</span>
            </div>

            <div className="pt-4 font-medium">
              המסמך יתקבל ביום המחרת בתא הדואר באתר האישי.
            </div>

          </div>
        
        
        </div>
        </div>
        {/* קו הפרדה אסתטי */}
        <div className="h-px bg-[#0078BE]/40 mx-6" />

        {/* חלק 2 - דרך המוקד */}
        <div className=" relative p-6">
                <div className="absolute left-1 bottom-1">
                       <WhatsAppButton />
                </div>
          
          <div className="flex items-center gap-3 mb-4">
            <Phone className="h-6 w-6 text-[#0078BE]" />
            <h2 className="text-xl font-semibold text-gray-700">2. דרך המוקד הטלפוני</h2>
          </div>
          <ul className="list-disc list-inside text-gray-700 space-y-1 leading-relaxed">
            <li>
              טלפון:{" "}
              <a
                href="tel:*6062"
                className="font-medium text-[#0078BE] hover:underline"
              >
                *6062
              </a>
            </li>
            <li>המוקד פעיל בימים א'–ה'</li>
            <li>שעות פעילות: 08:00–16:00</li>
          </ul>

        </div>

        <PdfUploadForm/>
      </div>
    </div>
  );
}
