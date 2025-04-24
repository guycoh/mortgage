import Image from "next/image";
import Link from "next/link";

import EmailIcon from "public/assets/images/svg/EmailIcon";
import Calculator1 from "public/assets/images/svg/Calculator1";
import Calculator2 from "public/assets/images/svg/Calculator2";
import Calculator3 from "public/assets/images/svg/Calculator3";
import Calculator4 from "public/assets/images/svg/Calculator4";
import Phone from "@/public/assets/images/svg/phone";
import WebIcon from "@/public/assets/images/svg/webIcon";
import WhatsappIcon from "@/public/assets/images/svg/whatsapp";
import WazeIcon from "@/public/assets/images/svg/wazeIcon";
import LocationIcon from "@/public/assets/images/svg/location";

export default function DigitalBusinessCard() {
  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-purple-700 to-gray-900 text-white grid md:grid-cols-2">
     {/* —— צד שמאל (ברכת הבית) —— */}
<div className="hidden md:flex flex-col justify-center items-center bg-white p-10 order-1 md:order-2 shadow-2xl rounded-3xl border border-gray-200">
  <h2 className="text-3xl font-bold mb-6 text-gray-900">
    ברוך הבא הביתה 💜
  </h2>
  <p className="text-gray-700 text-lg leading-relaxed text-center max-w-md font-medium relative">
    <span className="block mb-4 text-purple-700 font-semibold text-xl">
      ברכת הבית 🕊
    </span>
    <span className="italic text-gray-600">
      יהא זה המקום<br />
      בו תשכון אהבה<br />
      תפרח שלווה<br />
      תחיה תקווה<br />
      ותתמיד הברכה 🙏
    </span>
  </p>

  {/* קישוט תחתון סגול */}
  <div className="w-20 h-1 bg-purple-600 mt-6 rounded-full animate-pulse" />
</div>


      {/* —— צד ימין (כרטיס) —— */}
      <div className="flex flex-col justify-start items-stretch order-2 md:order-1 animate-fade-in">
        {/* Header לבן עם לוגו ותמונה */}
        <div className="relative h-52 bg-white w-full">
        
        <button className="bg-main absolute top-8 right-6 text-white font-semibold px-6 py-3 rounded-2xl shadow-lg hover:bg-blue-900 transition duration-300 ease-in-out">
           קבע פגישה
           <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
           <path d="M8 7V3m8 4V3m-9 4h10a2 2 0 012 2v11a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2z" />
           </svg>
        
        </button>

        
          <div className="absolute top-4 left-4 w-56 h-auto">
            <Image
              src="/assets/images/svg/muhni_logo.svg"
              alt="Logo"
              width={224}
              height={90}
              className="object-contain"
            />
          </div>
          <div className="absolute inset-0 flex justify-center items-end">
            <div className="w-36 h-36 z-10 rounded-full overflow-hidden border-4 border-white shadow-xl transform translate-y-1/2 bg-white">
              <Image
                src="/assets/images/imgFiles/my_image.jpg"
                alt="גיא כהן"
                width={144}
                height={144}
                className="object-cover"
              />
            </div>
          </div>
        </div>

        {/* בטן הכרטיס — גרדיאנט סגול עם הצללה פנימית */}
        <div className="relative bg-gradient-to-br from-purple-700 via-purple-600 to-purple-800 shadow-inner shadow-black/30 text-white flex flex-col items-center p-6">
                        <button className="absolute text-xs top-4 right-4 w-24 h-24 bg-white text-purple-600 rounded-full flex flex-col items-center justify-center gap-1 shadow-md hover:shadow-lg transition">
                  {/* אייקון */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 4h10M5 11h14M5 19h14M5 15h14" />
                  </svg>
                  קבע פגישה
                </button>
         
          {/* שם ותפקיד */}
          <h1 className="mt-20 text-3xl font-bold tracking-tight">גיא כהן</h1>
          <p className="text-white mt-2">יועץ משכנתאות בכיר </p>         
            <span className="text-white mt-2 flex items-center space-x-2">
              <span>052-3684844</span>
              <Phone size={14} color="white" />            
              <span>guycoh@outlook.co.il</span>
              <EmailIcon size={14} color="white" />
            </span>

            <span className="text-white mt-2 flex items-center space-x-2">
              <LocationIcon size={14} color="white" />    
              <span>שד' דוד המלך 2 , לוד</span>
              <LocationIcon size={14} color="white" />        
              <span>הרצל 92, רמלה</span>
          
            </span>



          {/* Grid של כפתורי יצירת קשר */}
        {/* Grid של כפתורים: יצירת קשר + מחשבונים */}  
<div className="mt-6 w-full flex flex-col gap-10">

        {/* — יצירת קשר — */}
        <div>
        <h2 className="text-xl font-semibold mb-4">יצירת קשר</h2>
        <div className="grid grid-cols-4 gap-4">
            <a href="tel:0523684844" className="flex flex-col items-center hover:opacity-80 transition">
            {/* טלפון */}
            <Phone size={40} color="white" />
            <span className="text-sm">התקשר</span>
            </a>
           
            <a href="https://wa.me/972523684844" target="_blank" className="flex flex-col items-center hover:opacity-80 transition">
            {/* וואטסאפ */}
            <WhatsappIcon size={40} color="white" />
            <span className="text-sm">וואטסאפ</span>
            </a>

            <a href="mailto:guycoh@outlook.co.il" className="flex flex-col items-center hover:opacity-80 transition">
            {/* מייל */}
            <EmailIcon size={40} color="white" />
            <span className="text-sm">מייל</span>
            </a>
            <a href="https://morg-orcin.vercel.app/muhni" className="flex flex-col items-center hover:opacity-80 transition">
            {/* מייל */}
            <WebIcon size={40} color="white" /> {/* סגול */}
            <span className="text-sm">אתר</span>
            </a>



            {/* אפשר להשאיר ריבוע ריק או כפתור נוסף בעתיד */}
            <div></div>
        </div>
        </div>

        {/* — מחשבוני משכנתא — */}
        <div>
        <h2 className="text-xl font-semibold mb-4">מחשבוני משכנתא</h2>
        <div className="grid grid-cols-4 gap-4">
            <Link href="/home/calculators/simple_calculator" className="flex flex-col items-center hover:opacity-80 transition">
              <Calculator1 size={40} color="white" />
            <span className="text-sm text-center">מחשבון הלוואה</span>
            </Link>

            <Link href="/home/calculators/mortgage_capability" className="flex flex-col items-center hover:opacity-80 transition">
              <Calculator2 size={40} color="white" />
            <span className="text-sm text-center">כמה משכנתא אוכל לקחת?</span>
            </Link>

            <Link href="/home/calculators/purchase_tax_calculator" className="flex flex-col items-center hover:opacity-80 transition">
              <Calculator3 size={40} color="white" />
            <span className="text-sm text-center">מס רכישה</span>
            </Link>
          
            <Link href="/home/calculators/purchase_tax_calculator" className="flex flex-col items-center hover:opacity-80 transition">
            <Calculator4 size={40} color="white" />
            <span className="text-sm text-center">החזר חודשי</span>
            </Link>
        </div>
        </div>
        </div>

        </div>

        {/* Footer */}
        <div className="bg-white text-xs text-center text-gray-400 py-3">


        <div className="grid grid-cols-4 gap-4 p-4">
              <a
                href="https://waze.com/ul?q=הרצל+92+רמלה&navigate=yes"
                target="_blank"
                rel="noopener noreferrer"
                className="col-span-1 flex flex-col items-center justify-center  p-4 hover:shadow-lg transition"
              >
                 < WazeIcon size={40} />
         
                <span className="text-center text-sm font-semibold">הרצל 92, רמלה</span>
              </a>

              <a
                href="https://waze.com/ul?q=שדרות+דוד+המלך+2+לוד&navigate=yes"
                target="_blank"
                rel="noopener noreferrer"
                className="col-span-1 flex flex-col items-center justify-center border rounded-2xl p-4 shadow hover:shadow-lg transition"
              >
                <Calculator1 className="w-10 h-10 mb-2 text-blue-500" />
                <span className="text-center text-sm font-semibold">שדרות דוד המלך 2, לוד</span>
              </a>

              </div>











          כל הזכויות שמורות © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
