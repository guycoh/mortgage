"use client"
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
  <div className="bg-white rounded-2xl shadow-lg border-2 border-orange-300 overflow-hidden">

    {/* חלק 1 - אתר הבנק */}
    <div className="relative p-6">

      {/* לוגו */}
      <div className="absolute left-1 top-1">
        <Image
          src="/assets/images/imgFiles/jerusalem.jpg"
          alt="jerusalem"
          width={240}
          height={120}
          className="rounded-xl mx-auto"
        />
      </div>

      <div className="mt-20">

        <div className="flex items-center gap-3 mb-4">
          <WebIcon className="h-6 w-6 text-orange-300" />
          <h2 className="text-xl font-semibold text-gray-700">
            1. דרך אתר הבנק
          </h2>
        </div>

        <div className="mb-4 text-gray-700">
          <span className="font-medium">
           
          </span>{" "}
          <a
            href="https://www.bankjerusalem.co.il/"
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
            <span className="text-orange-300 text-2xl font-bold inline-block">
              &#8629;
            </span>
            <span> אזור אישי </span>
          </div>

          <div className="flex items-center gap-2 pr-6">
            <span className="text-orange-300 text-2xl font-bold inline-block">
              &#8629;
            </span>
            <span>משכנתאות</span>
          </div>

          <div className="flex items-center gap-2 pr-10">
            <span className="text-orange-300 text-2xl font-bold inline-block">
              &#8629;
            </span>
            <span>בקשות שירות </span>
          </div>

          <div className="flex items-center gap-2 pr-14">
            <span className="text-orange-300 text-2xl font-bold inline-block">
              &#8629;
            </span>
            <span>בקשה לקבלת מצב חשבון משכנתא </span>
          </div>


          <div className="pt-4 font-medium">
          קבלת דו”ח במייל
          </div>
        </div>


      </div>
    </div>

    {/* קו הפרדה */}
    <div className="h-px bg-orange-300 mx-6" />

    {/* חלק 2 - מוקד טלפוני */}
    <div className="relative p-6">

      <div className="absolute left-1 bottom-1">
        <WhatsAppButton />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Phone className="h-6 w-6 text-orange-300" />
        <h2 className="text-xl font-semibold text-gray-700">
          2. דרך המוקד הטלפוני
        </h2>
      </div>

      <ul className="list-disc list-inside text-gray-700 space-y-1 leading-relaxed">
        <li>
          טלפון:{" "}
          <a href="tel:*2401" className="font-medium text-blue-600 hover:underline">
            *5726
          </a>
        </li>
       
      </ul>
    </div>



    <PdfUploadForm/>





  </div>
</div>
   
   
   </>


  );
}


