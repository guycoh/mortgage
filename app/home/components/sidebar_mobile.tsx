'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function SideMenu() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* כפתור פתיחה - יופיע רק במסכים קטנים מ-md */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed top-20 right-4 z-[60] bg-white rounded-full p-2 shadow-md transition-all duration-200 
          md:hidden ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        `}
        aria-label="פתח תפריט"
      >
        <div className="space-y-1">
          <span className="block w-6 h-0.5 bg-[#1d75a1]"></span>
          <span className="block w-6 h-0.5 bg-[#1d75a1]"></span>
          <span className="block w-6 h-0.5 bg-[#1d75a1]"></span>
        </div>
      </button>

      {/* רקע כהה מאחורי התפריט */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* תפריט צד מימין */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full bg-white w-72 max-w-full shadow-md p-6 transform transition-transform duration-300 ease-in-out 
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* כפתור סגירה - בצד שמאל וגדול */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 left-4 text-gray-500 hover:text-[#1d75a1] text-3xl"
          aria-label="סגור תפריט"
        >
          &times;
        </button>

        {/* קישורים */}
        <ul className="space-y-4 mt-12 text-right">
          <li>
            <Link href="/home" className="block text-[#1d75a1] hover:text-[#007bff] font-bold text-[15px]">בית</Link>
          </li>
          <li>
            <Link href="/home/about" className="block text-[#1d75a1] hover:text-[#007bff] font-bold text-[15px]">אודות</Link>
          </li>
          <li>
            <Link href="/home/calculators" className="block text-[#1d75a1] hover:text-[#007bff] font-bold text-[15px]">מחשבונים</Link>
          </li>
          <li>
            <Link href="/home/concepts" className="block text-[#1d75a1] hover:text-[#007bff] font-bold text-[15px]">מושגים במשכנתא</Link>
          </li>
          <li>
            <Link href="/home/contact" className="block text-[#1d75a1] hover:text-[#007bff] font-bold text-[15px]">צור קשר</Link>
          </li>
        </ul>
      </aside>
    </>
  )
}









// "use client"

// import { useState } from 'react';
// import Link from 'next/link';

// export default function Sidebar_admin() {
//   const [isOpen, setIsOpen] = useState(false);

//   const toggleSidebar = () => {
//     setIsOpen((prev) => !prev);
//   };

//   return (
//     <div className="relative" dir="rtl">
//       {/* Sidebar */}
//       <div
//         className={`fixed top-0 right-0 h-full bg-gray-800 text-white transition-transform duration-300 ${
//           isOpen ? 'translate-x-0' : 'translate-x-full'
//         } w-64`}
//       >
//         <div className="flex justify-between items-center p-4 bg-gray-900">
//           <h1 className="text-lg font-bold">תפריט</h1>
//           <button
//             onClick={toggleSidebar}
//             className="text-gray-400 hover:text-white"
//           >
//             ✖️
//           </button>
//         </div>
//         <ul className="p-4 space-y-2">
//           <li className="hover:bg-gray-700 p-2 rounded"> <Link href="/admin/dashboard" > 🏠 דף הבית </Link></li>
//           <li className="hover:bg-gray-700 p-2 rounded"> <Link href="/private/admin/dashboard/concepts" > 🏠 מושגים משכנתא</Link></li>
          
//           <li className="hover:bg-gray-700 p-2 rounded"> <Link href="/private/admin/users" > 👥 משתמשים</Link></li>
//           <li className="hover:bg-gray-700 p-2 rounded"> <Link href="/private/admin/premissions" > 🔐 סוגי הרשאות</Link></li>           
//           <li className="hover:bg-gray-700 p-2 rounded"> טבלאות מערכת</li>
//           <li className="hover:bg-gray-700 p-2 rounded"> <Link href="/private/admin/status_call" > 📞 טבלת סטטוס שיחה</Link></li>       
//           <li className="hover:bg-gray-700 p-2 rounded"> <Link href="/private/admin/reason_not_intrested" > 😒 סיבת לא נסגר</Link></li>
//           <li className="hover:bg-gray-700 p-2 rounded">📧 יצירת קשר</li>       
//           <li className="hover:bg-gray-700 p-2 rounded"> <Link href="/admin/setting" > ⚙️ הגדרות</Link></li>
//           ✒️🔐📊📄
//         </ul>
//       </div>

//       {/* Open Button */}
//       {!isOpen && (
//         <button
//           onClick={toggleSidebar}
//           className="fixed top-4 right-4 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 focus:outline-none"
//         >
//           ☰
//         </button>
//       )}
//     </div>
//   );
// }








