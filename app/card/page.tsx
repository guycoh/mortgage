import Image from "next/image";
import Link from "next/link";

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
          <p className="text-purple-200 mt-2 text-base">יועץ משכנתאות בכיר 💼</p>

          {/* Grid של כפתורי יצירת קשר */}
        {/* Grid של כפתורים: יצירת קשר + מחשבונים */}  
<div className="mt-6 w-full flex flex-col gap-10">

        {/* — יצירת קשר — */}
        <div>
        <h2 className="text-xl font-semibold mb-4">יצירת קשר</h2>
        <div className="grid grid-cols-4 gap-4">
            <a href="tel:0501234567" className="flex flex-col items-center hover:opacity-80 transition">
            {/* טלפון */}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.05-.24 11.36 11.36 0 003.55.57 1 1 0 011 1v3.61a1 1 0 01-.91 1A19 19 0 015 5.91a1 1 0 011-0.91h3.61a1 1 0 011 1 11.36 11.36 0 00.57 3.55 1 1 0 01-.24 1.05z"/>
            </svg>
            <span className="text-sm">התקשר</span>
            </a>

            <a href="https://wa.me/972501234567" target="_blank" className="flex flex-col items-center hover:opacity-80 transition">
            {/* וואטסאפ */}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.157 5.318 5.478 0 12.078 0c3.181 0 6.167 1.24 8.413 3.488a11.822 11.822 0 013.493 8.41c-.003 6.6-5.385 11.922-11.985 11.922a11.9 11.9 0 01-5.688-1.448L.057 24z"/><path d="M17.472 14.382l-2.745-.789a.578.578 0 00-.541.15l-.79.811a9.554 9.554 0 01-4.455-4.453l.811-.791a.568.568 0 00.15-.54l-.79-2.745a.568.568 0 00-.528-.396h-.888c-.297 0-.56.133-.743.364a2.58 2.58 0 00-.45 1.519c0 1.48.863 3.07 2.56 4.768 1.695 1.694 3.284 2.558 4.767 2.558a2.59 2.59 0 001.52-.449c.23-.185.364-.447.364-.744v-.889a.566.566 0 00-.397-.528z"/>
            </svg>
            <span className="text-sm">וואטסאפ</span>
            </a>

            <a href="mailto:email@example.com" className="flex flex-col items-center hover:opacity-80 transition">
            {/* מייל */}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
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
            <Link href="/mortgage-calculator" className="flex flex-col items-center hover:opacity-80 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-2 14H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
            <span className="text-sm text-center">מחשבון משכנתא</span>
            </Link>

            <Link href="/eligibility-calculator" className="flex flex-col items-center hover:opacity-80 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span className="text-sm text-center">מחשבון זכאות</span>
            </Link>

            <Link href="/amortization-schedule" className="flex flex-col items-center hover:opacity-80 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zm0-8h14V7H7v2z"/>
            </svg>
            <span className="text-sm text-center">לוח סילוקין</span>
            </Link>

            <Link href="/monthly-payment-calculator" className="flex flex-col items-center hover:opacity-80 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H5V5h14v14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0-8h2v2H7V3z"/>
            </svg>
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
