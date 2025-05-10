import Link from "next/link";

const MenuPage = () => {
  return (
    <main className="bg-gradient-to-br from-purple-50 via-violet-100 to-purple-200 text-gray-700 leading-relaxed">
    <div className=" from-white to-[#f8f8f8] min-h-screen flex flex-col justify-center items-center py-10">
      <div className="bg-white p-8 rounded-xl shadow-lg w-11/12 md:w-1/2 lg:w-1/3 text-center space-y-6 border border-gray-200">
        <h1 className="text-4xl font-bold text-gray-800 tracking-tight">
          מדריכים להוצאת יתרת סילוק
        </h1>
        <div className="space-y-4 mt-6">
          <Link
            href="/muhni/bb/mizrachi"
            className="block text-xl font-semibold text-white bg-gradient-to-r from-orange-400 to-orange-600 hover:bg-gradient-to-l py-3 px-6 rounded-lg shadow-lg transform transition duration-300 ease-in-out hover:scale-105"
          >
            בנק מזרחי
          </Link>
          <Link
            href="/muhni/bb/leumi"
            className="block text-xl font-semibold text-white bg-gradient-to-r from-sky-400 to-blue-600 hover:bg-gradient-to-l py-3 px-6 rounded-lg shadow-lg transform transition duration-300 ease-in-out hover:scale-105"
          >
            בנק לאומי
          </Link>
          <Link
            href="/muhni/bb/hapoalim"
            className="block text-xl font-semibold text-white bg-gradient-to-r from-red-500 to-red-700 hover:bg-gradient-to-l py-3 px-6 rounded-lg shadow-lg transform transition duration-300 ease-in-out hover:scale-105"
          >
            בנק פועלים
          </Link>
          <Link
            href="/muhni/bb/discount"
            className="block text-xl font-semibold text-white bg-gradient-to-r from-green-500 to-green-700 hover:bg-gradient-to-l py-3 px-6 rounded-lg shadow-lg transform transition duration-300 ease-in-out hover:scale-105"
          >
            בנק דיסקונט
          </Link>
          <Link
            href="/muhni/bb/benleumi"
            className="block text-xl font-semibold text-white bg-gradient-to-r from-yellow-400 to-yellow-600 hover:bg-gradient-to-l py-3 px-6 rounded-lg shadow-lg transform transition duration-300 ease-in-out hover:scale-105"
          >
            בנק בינלאומי
          </Link>
         

        </div>
      </div>
    </div>
    </main>

  );
};

export default MenuPage;


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

