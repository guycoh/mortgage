"use client"

import { useState } from 'react';
import Link from 'next/link';

export default function Sidebar_admin() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTablesOpen, setIsTablesOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen((prev) => !prev);
  };

  const toggleTables = () => {
    setIsTablesOpen((prev) => !prev);
  };

  return (
    <div className="z-20 relative" dir="rtl">
      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full bg-gray-800 text-white transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } w-64`}
      >
        <div className="flex justify-between items-center p-4 bg-gray-900">
          <h1 className="text-lg font-bold">תפריט</h1>
          <button
            onClick={toggleSidebar}
            className="text-gray-400 hover:text-white"
          >
            ✖️
          </button>
        </div>
        <ul className="p-4 space-y-2">
          <li className="hover:bg-gray-700 p-2 rounded"> <Link href="/admin/dashboard" > 🏠 דף הבית </Link></li>
          <li className="hover:bg-gray-700 p-2 rounded"> <Link href="/private/admin/leadweb" > 👥 לידים מהאתר</Link></li>
          
          <li className="hover:bg-gray-700 p-2 rounded"> <Link href="/private/admin/concepts" > 🏠 מושגים משכנתא</Link></li>
          
          <li className="hover:bg-gray-700 p-2 rounded"> <Link href="/private/admin/users" > 👥 משתמשים</Link></li>
          <li className="hover:bg-gray-700 p-2 rounded"> <Link href="/private/admin/premissions" > 🔐 סוגי הרשאות</Link></li> 
          <li className="hover:bg-gray-700 p-2 rounded"> <Link href="/private/admin/receipts" > 📄 קבלות לקוחות</Link></li> 
          <li className="p-2 rounded cursor-pointer bg-gray-800 hover:bg-gray-700" onClick={toggleTables}>📊 טבלאות מערכת {isTablesOpen ? '▲' : '▼'}</li>
          {isTablesOpen && (
            <ul className="pl-4 space-y-2">
              <li className="hover:bg-gray-700 p-2 rounded"> <Link href="/private/admin/status_call" > 📞 טבלת סטטוס שיחה</Link></li>       
              <li className="hover:bg-gray-700 p-2 rounded"> <Link href="/private/admin/reason_not_intrested" > 😒 סיבת לא נסגר</Link></li>
            </ul>
          )}
          
          <li className="hover:bg-gray-700 p-2 rounded">📧 יצירת קשר</li>       
          <li className="hover:bg-gray-700 p-2 rounded"> <Link href="/admin/setting" > ⚙️ הגדרות</Link></li>
        </ul>
      </div>

      {/* Open Button */}
      {!isOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 right-4 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 focus:outline-none"
        >
          ☰
        </button>
      )}
    </div>
  );
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








