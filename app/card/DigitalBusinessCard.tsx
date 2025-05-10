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
import WazeIcon from "@/public/assets/images/svg/waze";
import LocationIcon from "@/public/assets/images/svg/location";

export default function DigitalBusinessCard() {
  return (
    <div className="w-full min-h-screen bg-gradient-to-br text-white grid md:grid-cols-2">
  


      {/* —— צד ימין (כרטיס) —— */}
      <div className="flex flex-col justify-start items-stretch order-2 md:order-1 animate-fade-in">
        {/* Header לבן עם לוגו ותמונה */}
        <div className="relative h-52 bg-white w-full">
        
        
        
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
                <Link href="/muhni/schedule" className="absolute text-xs top-4 right-4 w-24 h-24 bg-white text-purple-600 rounded-full flex flex-col items-center justify-center gap-1 shadow-md hover:shadow-lg transition">
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
                </Link>

               
               
                

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
<div className="mt-6 w-full flex flex-col gap-4">

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



        </div>
        </div>

        {/* — מחשבוני משכנתא — */}
        <div>
        <h2 className="text-xl font-semibold mb-4">מחשבוני משכנתא</h2>
        <div className="grid grid-cols-4 gap-4">
            <Link href="/muhni/calculators/simple_calculator" className="flex flex-col items-center hover:opacity-80 transition">
              <Calculator1 size={40} color="white" />
            <span className="text-sm text-center">מחשבון הלוואה</span>
            </Link>

            <Link href="/muhni/calculators/mortgage_capability" className="flex flex-col items-center hover:opacity-80 transition">
              <Calculator2 size={40} color="white" />
            <span className="text-sm text-center">כמה משכנתא אוכל לקחת?</span>
            </Link>

            <Link href="/muhni/calculators/purchase_tax_calculator" className="flex flex-col items-center hover:opacity-80 transition">
              <Calculator3 size={40} color="white" />
            <span className="text-sm text-center">מס רכישה</span>
            </Link>
          
            <Link href="/muhni/calculators/refinance-calculator" className="flex flex-col items-center hover:opacity-80 transition">
            <Calculator4 size={40} color="white" />
            <span className="text-sm text-center">החזר חודשי</span>
            </Link>
        </div>
        </div>
        </div>

        </div>

        {/* Footer */}
        <div className="bg-gradient-to-br from-purple-700 via-purple-600 to-purple-800 text-xs text-center text-gray-400 p-6">
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div className="bg-white flex flex-col items-center justify-center border rounded-2xl p-6 shadow hover:shadow-lg transition">
              <a
                href="https://waze.com/ul?q=הרצל+92+רמלה&navigate=yes"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center space-y-4"
              >
                <WazeIcon size={60} />
                <span className="text-center text-sm font-semibold">הרצל 92, רמלה</span>
              </a>
            </div>
            <div className=" bg-white flex flex-col items-center justify-center border rounded-2xl p-6 shadow hover:shadow-lg transition">
              <a
                href="https://waze.com/ul?q=שדרות+דוד+המלך+2+לוד&navigate=yes"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center space-y-4"
              >
                <WazeIcon size={60} />
                <span className="text-center text-sm font-semibold">שדרות דוד המלך 2, לוד</span>
              </a>
            </div>
          </div>

  <div className="text-gray-400 text-xs">
    כל הזכויות שמורות © {new Date().getFullYear()}
  </div>
</div>


      </div>
    </div>
  );
}
