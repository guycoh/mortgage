
import Phone from "@/public/assets/images/svg/phone";
import WebIcon from "@/public/assets/images/svg/webIcon";
import Image from "next/image";
import WhatsAppButton from "@/app/home/components/WhatsAppButton";



export const metadata = {
  title: 'מדריך להוצאת דוח יתרות לסילוק – דיסקונט ',
  description: 'הסבר פשוט ומדויק איך להוציא דוח יתרות לסילוק מבנק דיסקונט .',
  openGraph: {
    title: 'מדריך להוצאת דוח יתרות לסילוק – דיסקונט ',
    description: 'הסבר פשוט ומדויק איך להוציא דוח יתרות לסילוק מבנק דיסקונט .',
    url: 'https://morg-orcin.vercel.app/muhni/bb/mizrachi',
    images: [
      {
        url: 'https://morg-orcin.vercel.app/og/mizrachi-guide.png',
        width: 1200,
        height: 630,
        alt: 'מדריך להוצאת דוח יתרות – דיסקונט ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'מדריך להוצאת דוח יתרות לסילוק – דיסקונט ',
    description: 'הסבר פשוט ומדויק איך להוציא דוח יתרות לסילוק מבנק דיסקונט .',
    images: ['https://morg-orcin.vercel.app/assets/images/imgFiles/guywhapp.jpg'],
  },
};


export default function MortgageClearanceInstructions() {
  return (
  <>
  <div className="max-w-4xl mx-auto p-6 space-y-8 font-open-sans font-normal">
  <h1 className="text-3xl font-bold text-center mt-16 text-gray-800">
    איך מזמינים אישור יתרות לסילוק מדיסקונט?
  </h1>

  {/* כרטיס מרכזי */}
  <div className="bg-white rounded-2xl shadow-lg border-2 border-green-500/30 overflow-hidden">

    {/* חלק 1 - אתר הבנק */}
    <div className="relative p-6">

      {/* לוגו */}
      <div className="absolute left-1 top-1">
        <Image
          src="/assets/images/imgFiles/discount.png"
          alt="discount"
          width={120}
          height={60}
          className="rounded-xl mx-auto"
        />
      </div>

      <div className="mt-20">

        <div className="flex items-center gap-3 mb-4">
          <WebIcon className="h-6 w-6 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-700">
            1. דרך אתר הבנק
          </h2>
        </div>

        <div className="mb-4 text-gray-700">
          <span className="font-medium">
            ניתן לקבל את הדוח באתר הבנק רק אם ברשותכם קוד משתמש וסיסמא,
            וחשבון העו״ש שלכם מתנהל גם בדיסקונט.
          </span>{" "}
          <a
            href="https://www.discountbank.co.il/private/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 font-medium hover:underline"
          >
            <strong>לוחצים כאן</strong>
          </a>
        </div>

        {/* שלבים עם חיצים */}
        <div className="text-gray-700 leading-relaxed space-y-2 pr-2">

          <div className="font-semibold">
            לוחצים על כניסה לחשבונות פרטיים
          </div>

          <div className="flex items-center gap-2 pr-2">
            <span className="text-green-600 text-2xl font-bold inline-block">
              &#8629;
            </span>
            <span>מזינים קוד משתמש וסיסמא</span>
          </div>

          <div className="flex items-center gap-2 pr-6">
            <span className="text-green-600 text-2xl font-bold inline-block">
              &#8629;
            </span>
            <span>תפריט </span>
          </div>

          <div className="flex items-center gap-2 pr-10">
            <span className="text-green-600 text-2xl font-bold inline-block">
              &#8629;
            </span>
            <span>משכנתאות </span>
          </div>

          <div className="flex items-center gap-2 pr-14">
            <span className="text-green-600 text-2xl font-bold inline-block">
              &#8629;
            </span>
            <span>
             פירוט המשכנתא המלא כולל יתרה לסילוק (תדפיס) 
            </span>
          </div>

          <div className="pt-4 font-medium">
           מקבלים מיד את הדוח בקובץ להדפסה או לשמירה במחשב
          </div>
        </div>
      </div>
    </div>

    {/* קו הפרדה */}
    <div className="h-px bg-green-300 mx-6" />

    {/* חלק 2 - מוקד טלפוני */}
    <div className="relative p-6">

      <div className="absolute left-1 bottom-1">
        <WhatsAppButton />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Phone className="h-6 w-6 text-green-600" />
        <h2 className="text-xl font-semibold text-gray-700">
          2. דרך המוקד הטלפוני
        </h2>
      </div>

      <ul className="list-disc list-inside text-gray-700 space-y-1 leading-relaxed">
        <li>
          טלפון:{" "}
          <a href="tel:*2009" className="font-medium text-blue-600 hover:underline">
            *2009
          </a>
        </li>
        <li>שעות פתיחה: א'-ה' 08:00–19:00, ו' 08:00–13:00</li>
      </ul>
    </div>

  </div>
</div>
  
  
  </>
  
  
  
  
  );
}
