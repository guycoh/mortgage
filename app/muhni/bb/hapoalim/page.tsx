"use client";
import Phone from "@/public/assets/images/svg/phone";
import WebIcon from "@/public/assets/images/svg/webIcon";
import Image from "next/image";

export default function MortgageClearanceInstructions() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-center text-gray-800">
        איך מזמינים אישור יתרות לסילוק?
      </h1>

      {/* תיבת מידע מעוצבת */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-red-500/30 overflow-hidden">
        {/* חלק 1 - אתר הבנק */}
        <div className="relative p-6">
          <div className="absolute left-1 top-1">
            <Image
              src="/assets/images/imgFiles/hapoalim.png"
              alt="poalim"
              width={120}
              height={60}
              className="rounded-xl mx-auto"
            />
          </div>

          <div className="flex items-center gap-3 mb-4">
            <WebIcon className="h-6 w-6 text-red-600" />
            <h2 className="text-xl font-semibold text-fonts">1. דרך אתר הבנק</h2>
          </div>

          <div className="mb-4 text-text-fonts">
            <span className="font-medium">
              ניתן לקבל את הדוח באתר הבנק רק במידה וקיים ברשותכם קוד משתמש וסיסמא,
              וחשבון העו״ש שלכם מתנהל גם בפועלים.
            </span>{" "}
            <a
              href="https://www.bankhapoalim.co.il/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 font-medium cursor-pointer hover:underline"
            >
              <strong>לוחצים כאן</strong>
            </a>
          </div>

          <ol className="list-decimal list-inside space-y-2 text-text-fonts leading-relaxed">
            <li>מזינים שם משתמש וסיסמא</li>
            <li>
              בוחרים באפשרות <span className="font-medium">"דוח פרטי משכנתאות"</span>
            </li>
            <li>מאשרים קבלת דוח</li>
            <li>מקבלים מיד את הדוח בקובץ להדפסה או לשמירה במחשב</li>
          </ol>
        </div>

        {/* קו הפרדה */}
        <div className="h-[1px] bg-red-300 mx-6" />

        {/* חלק 2 - מוקד טלפוני */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Phone className="h-6 w-6 text-red-600" />
            <h2 className="text-xl font-semibold text-text-fonts">2. דרך המוקד הטלפוני</h2>
          </div>

          <ul className="list-disc list-inside text-fonts space-y-1 leading-relaxed">
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
      </div>
    </div>
  );
}













// "use client";
// import Phone from "@/public/assets/images/svg/phone";
// import WebIcon from "@/public/assets/images/svg/webIcon";
// import Image from "next/image";

// export default function MortgageClearanceInstructions() {
//   return (
//     <div className="max-w-4xl mx-auto p-6 space-y-8">
//       <h1 className="text-3xl font-bold text-center text-gray-800">
//         איך מזמינים אישור יתרות לסילוק?
//       </h1>

//       {/* תיבת מידע מעוצבת */}
//       <div className="bg-white rounded-2xl shadow-lg border-2 border-red-500/30 overflow-hidden">
//         {/* חלק 1 - אתר הבנק */}
//         <div className="relative p-6">
//           <div className="absolute left-1 top-1">
//             <Image
//               src="/assets/images/imgFiles/hapoalim.png"
//               alt="poalim"
//               width={120}
//               height={60}
//               className="rounded-xl mx-auto"
//             />
//           </div>

//           <div className="flex items-center gap-3 mb-4">
//             <WebIcon className="h-6 w-6 text-red-600" />
//             <h2 className="text-xl font-semibold text-fonts">1. דרך אתר הבנק</h2>
//           </div>

//           <div className="mb-4 text-text-fonts">
//             <span className="font-medium">
//               ניתן לקבל את הדוח באתר הבנק רק במידה וקיים ברשותכם קוד משתמש וסיסמא,
//               וחשבון העו״ש שלכם מתנהל גם בפועלים.
//             </span>{" "}
//             <a
//               href="https://www.bankhapoalim.co.il/"
//               target="_blank"
//               rel="noopener noreferrer"
//             >
//               <span className="text-blue-600 font-medium cursor-pointer hover:underline">
//                 לוחצים כאן
//               </span>
//             </a>
//           </div>

//           <ol className="list-decimal list-inside space-y-2 text-text-fonts leading-relaxed">
//             <li>מזינים שם משתמש וסיסמא</li>
//             <li>בוחרים באפשרות <span className="font-medium">"דוח פרטי משכנתאות"</span></li>
//             <li>מאשרים קבלת דוח</li>
//             <li>מקבלים מיד את הדוח בקובץ להדפסה או לשמירה במחשב</li>
//           </ol>
//         </div>

//         {/* קו הפרדה */}
//         <div className="h-[1px] bg-red-300 mx-6" />

//         {/* חלק 2 - מוקד טלפוני */}
//         <div className="p-6">
//           <div className="flex items-center gap-3 mb-4">
//             <Phone className="h-6 w-6 text-red-600" />
//             <h2 className="text-xl font-semibold text-text-fonts">2. דרך המוקד הטלפוני</h2>
//           </div>

//           <ul className="list-disc list-inside text-fonts space-y-1 leading-relaxed">
//             <li>
//               טלפון: <span className="font-medium text-blue-600">*2401</span>
//             </li>
//             <li>המוקד פעיל בימים א'–ה'</li>
//             <li>שעות פעילות: 08:00–16:00</li>
//           </ul>
//         </div>
//       </div>
//     </div>
//   );
// }
