import Image from "next/image";
import Link from "next/link";

import EmailIcon from "public/assets/images/svg/EmailIcon";
import Calculator1 from "public/assets/images/svg/Calculator1";
import Calculator2 from "public/assets/images/svg/Calculator2";
import Calculator3 from "public/assets/images/svg/Calculator3";
import Calculator4 from "public/assets/images/svg/Calculator4";
import Phone from "@/public/assets/images/svg/phone";

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
            <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-white shadow-xl transform translate-y-1/2 bg-white">
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
        <div className="bg-gradient-to-br from-purple-700 via-purple-600 to-purple-800 shadow-inner shadow-black/30 text-white flex flex-col items-center p-6">
          {/* שם ותפקיד */}
          <h1 className="mt-20 text-3xl font-bold tracking-tight">גיא כהן</h1>
          <p className="text-purple-200 mt-2 text-base">יועץ משכנתאות בכיר </p>
          <p className="text-purple-200 mt-2 text-base">052-3684844   guycoh@outlook.co.il     </p>

          {/* Grid של כפתורי יצירת קשר */}
        {/* Grid של כפתורים: יצירת קשר + מחשבונים */}  
<div className="mt-6 w-full flex flex-col gap-10">

        {/* — יצירת קשר — */}
        <div>
        <h2 className="text-xl font-semibold mb-4">יצירת קשר</h2>
        <div className="grid grid-cols-4 gap-4">
            <a href="tel:0501234567" className="flex flex-col items-center hover:opacity-80 transition">
            {/* טלפון */}
            <Phone size={40} color="white" />
            <span className="text-sm">התקשר</span>
            </a>

            <a href="https://wa.me/972501234567" target="_blank" className="flex flex-col items-center hover:opacity-80 transition">
            {/* וואטסאפ */}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.157 5.318 5.478 0 12.078 0c3.181 0 6.167 1.24 8.413 3.488a11.822 11.822 0 013.493 8.41c-.003 6.6-5.385 11.922-11.985 11.922a11.9 11.9 0 01-5.688-1.448L.057 24z"/><path d="M17.472 14.382l-2.745-.789a.578.578 0 00-.541.15l-.79.811a9.554 9.554 0 01-4.455-4.453l.811-.791a.568.568 0 00.15-.54l-.79-2.745a.568.568 0 00-.528-.396h-.888c-.297 0-.56.133-.743.364a2.58 2.58 0 00-.45 1.519c0 1.48.863 3.07 2.56 4.768 1.695 1.694 3.284 2.558 4.767 2.558a2.59 2.59 0 001.52-.449c.23-.185.364-.447.364-.744v-.889a.566.566 0 00-.397-.528z"/>
            </svg>
            <span className="text-sm">וואטסאפ</span>
            </a>

            <a href="mailto:guycoh@outlook.co.il" className="flex flex-col items-center hover:opacity-80 transition">
            {/* מייל */}
            <EmailIcon size={32} color="white" /> {/* סגול */}
            <span className="text-sm">מייל</span>
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
        <div className="bg-gray-800/60 text-xs text-center text-gray-400 py-3">
          כל הזכויות שמורות © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
