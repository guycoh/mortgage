"use client";
import Phone from "@/public/assets/images/svg/phone";
import WebIcon from "@/public/assets/images/svg/webIcon";
import Image from "next/image";
import WhatsAppButton from "../../components/WhatsAppButton";
export default function MortgageClearanceInstructions() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-center text-gray-800">
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
          <ol className="list-decimal list-inside space-y-2 text-gray-700 leading-relaxed">
            <li>מזינים את פרטי הכניסה האישיים שלכם</li>
            <li>נכנסים לתפריט המופיע בצד ימין של המסך</li>
            <li>
              לוחצים על <span className="font-medium">"הלוואות ומשכנתאות"</span>
            </li>
            <li>
              בוחרים <span className="font-medium">"הזמנת מסמכי משכנתאות"</span>
            </li>
            <li>
              במסך שנפתח מזמינים את המסמך{" "}
              <span className="font-medium">"אישור יתרות לסילוק"</span>
            </li>
            <li>המסמך יתקבל ביום המחרת בתא הדואר באתר האישי</li>
          </ol>
        </div>

        {/* קו הפרדה אסתטי */}
        <div className="h-[1px] bg-[#0078BE]/40 mx-6" />

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
      </div>
    </div>
  );
}



// "use client"
// import Phone from "@/public/assets/images/svg/phone";
// import WebIcon from "@/public/assets/images/svg/webIcon";
// import Image from "next/image";

// export default function MortgageClearanceInstructions() {
//   return (
//     <div className="max-w-4xl mx-auto p-6 space-y-8">
//       <h1 className="text-3xl font-bold text-center text-gray-800">
//           איך מזמינים אישור יתרות לסילוק?
//       </h1>

//       {/* מקטע מאוחד */}
//       <div className="bg-white rounded-2xl shadow-lg border-2 border-[#0078BE]/30 overflow-hidden">
//         {/* חלק 1 - דרך אתר הבנק */}
//         <div className="relative p-6">
//           <div className="absolute left-1 top-1">
//             <Image
//               src="/assets/images/imgFiles/leumi.png"
//               alt="leumi"
//               width={120}
//               height={60}
//               className="rounded-xl mx-auto"
//             />
//           </div>

//           <div className="flex items-center gap-3 mb-4">
//             <WebIcon className="h-6 w-6 text-[#0078BE]" />
//             <h2 className="text-xl font-semibold text-gray-700">1. דרך אתר הבנק</h2>
//           </div>
//           <div className="mb-4 text-gray-700">
//             <span className="font-medium">
//               במידה ויש ברשותכם את פרטי הכניסה (שם משתמש וסיסמה),
//             </span>{" "}
//             <a
//               href="https://hb2.bankleumi.co.il/staticcontent/gate-keeper/he/?trackingCode=742f6fb3-50a8-4d25-52c9-98a3de133a6b&sysNum=23&langNum=1"
//               target="_blank"
//               rel="noopener noreferrer"
//             >
//               <span className="text-[#0078BE] font-medium cursor-pointer hover:underline">
//                 לחצו כאן
//               </span>
//             </a>
//           </div>
//           <ol className="list-decimal list-inside space-y-2 text-gray-700 leading-relaxed">
//             <li>מזינים את פרטי הכניסה האישיים שלכם</li>
//             <li>נכנסים לתפריט המופיע בצד ימין של המסך</li>
//             <li>
//               לוחצים על <span className="font-medium">"הלוואות ומשכנתאות"</span>
//             </li>
//             <li>
//               בוחרים <span className="font-medium">"הזמנת מסמכי משכנתאות"</span>
//             </li>
//             <li>
//               במסך שנפתח מזמינים את המסמך{" "}
//               <span className="font-medium">"אישור יתרות לסילוק"</span>
//             </li>
//             <li>המסמך יתקבל ביום המחרת בתא הדואר באתר האישי</li>
//           </ol>
//         </div>

//         {/* קו הפרדה אסתטי */}
//         <div className="h-[1px] bg-[#0078BE]/40 mx-6" />

//         {/* חלק 2 - דרך המוקד */}
//         <div className="p-6">
//           <div className="flex items-center gap-3 mb-4">
//             <Phone className="h-6 w-6 text-[#0078BE]" />
//             <h2 className="text-xl font-semibold text-gray-700">2. דרך המוקד הטלפוני</h2>
//           </div>
//           <ul className="list-disc list-inside text-gray-700 space-y-1 leading-relaxed">
//             <li>
//               טלפון: <span className="font-medium text-[#0078BE]">6062*</span>
//             </li>
//             <li>המוקד פעיל בימים א'–ה'</li>
//             <li>שעות פעילות: 08:00–16:00</li>
//           </ul>
//         </div>
//       </div>
//     </div>
//   );
// }
















// "use client"
// import Phone from "@/public/assets/images/svg/phone";
// import WebIcon from "@/public/assets/images/svg/webIcon";

// import Image from "next/image";

// export default function MortgageClearanceInstructions() {
//   return (
//     <div className="max-w-4xl mx-auto p-6 space-y-8">
//       <h1 className="text-3xl font-bold text-center text-gray-800">איך מזמינים אישור יתרות לסילוק?</h1>

//       {/* דרך אתר הבנק */}
//       <div className=" relative bg-white rounded-2xl shadow-lg p-6 border border-[#0078BE]/20">
       
 
//        <div className="absolute left-1 top-1">
//           <Image
//             src="/assets/images/imgFiles/leumi.png"
//             alt="leumi"
//             width={120}
//             height={60}
//             className="rounded-xl mx-auto"
//         />
//         </div>
          
       
//         <div className="flex items-center gap-3 mb-4">
//           <WebIcon className="h-6 w-6 text-[#0078BE]" />
//           <h2 className="text-xl font-semibold text-gray-700">1. דרך אתר הבנק</h2>
//         </div>
//         <div className="mb-4 text-gray-700">
//           <span className="font-medium">במידה ויש ברשותכם את פרטי הכניסה (שם משתמש וסיסמה), </span>
//             <a
//                 href="https://hb2.bankleumi.co.il/staticcontent/gate-keeper/he/?trackingCode=742f6fb3-50a8-4d25-52c9-98a3de133a6b&sysNum=23&langNum=1"
//                 target="_blank"
//                 rel="noopener noreferrer">
//            <span className="text-[#0078BE] font-medium cursor-pointer hover:underline">לחצו כאן</span>
//             </a>
//         </div>
//         <ol className="list-decimal list-inside space-y-2 text-gray-700 leading-relaxed">
//           <li>מזינים את פרטי הכניסה האישיים שלכם</li>
//           <li>נכנסים לתפריט המופיע בצד ימין של המסך</li>
//           <li>לוחצים על <span className="font-medium">"הלוואות ומשכנתאות"</span></li>
//           <li>בוחרים <span className="font-medium">"הזמנת מסמכי משכנתאות"</span></li>
//           <li>במסך שנפתח מזמינים את המסמך <span className="font-medium">"אישור יתרות לסילוק"</span></li>
//           <li>המסמך יתקבל ביום המחרת בתא הדואר באתר האישי</li>
//         </ol>
//       </div>
     
//       {/* דרך המוקד */}
//       <div className="bg-white rounded-2xl shadow-lg p-6 border border-[#0078BE]/20">
//         <div className="flex items-center gap-3 mb-4">
//           <Phone className="h-6 w-6 text-[#0078BE]" />
//           <h2 className="text-xl font-semibold text-gray-700">2. דרך המוקד הטלפוני</h2>
//         </div>
//         <ul className="list-disc list-inside text-gray-700 space-y-1 leading-relaxed">
//           <li>טלפון: <span className="font-medium text-[#0078BE]">*6062</span></li>
//           <li>המוקד פעיל בימים א'–ה'</li>
//           <li>שעות פעילות: 08:00–16:00</li>
//         </ul>
//       </div>
//     </div>
//   );
// }

