
'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function SideMenu({ triggerButton }: { triggerButton: (onClick: () => void, isOpen: boolean) => React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* כפתור פתיחה – נשלח כ־prop */}
      {triggerButton(setIsOpen.bind(null, true), isOpen)}

      {/* רקע כהה */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* תפריט צד מימין */}
      <aside
        className={`fixed top-4 right-0 z-50 h-full bg-white w-72 max-w-full shadow-md p-6 transform transition-transform duration-300 ease-in-out 
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* כפתור סגירה */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 left-4 text-gray-500 hover:text-[#1d75a1] text-5xl"
          aria-label="סגור תפריט"
        >
          &times;
        </button>

        {/* קישורים */}
        <ul className="space-y-4 mt-12 text-right">
          {[
            ['בית', '/home'],
            ['אודות', '/home/about'],
            ['מחשבונים', '/home/calculators'],
            ['מושגים במשכנתא', '/home/concepts'],
            ['צור קשר', '/home/contact'],
          ].map(([text, href]) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setIsOpen(false)}
                className="block text-gray-500 hover:text-[#007bff] font-bold text-[20px]"
              >
                {text}
              </Link>
            </li>
          ))}
        </ul>

        <ul className="space-y-4 mt-12 text-right">

            <li >
                  <Link
                    href="/home/schedule"                
                    className="block text-[#1d75a1] hover:text-[#007bff] font-bold text-[20px]"             
                    onClick={() => setIsOpen(false)}
                    >
                  
                   קביעת זום
                  </Link>
            </li>
            <li >
              <Link
                href="/login"                
                className="block text-[#1d75a1] hover:text-[#007bff] font-bold text-[20px]" 
                onClick={() => setIsOpen(false)}
                >
                כניסה למערכת
              </Link>
            </li>
            <li >
              <Link
                href="/signup"                
                className="block text-[#1d75a1] hover:text-[#007bff] font-bold text-[20px]"
                onClick={() => setIsOpen(false)}
                >
                הרשמה
              </Link>
            </li>
            



         
        </ul>





        


      </aside>
    </>
  )
}























// 'use client'

// import Link from 'next/link'
// import { useState } from 'react'

// export default function SideMenu() {
//   const [isOpen, setIsOpen] = useState(false)

//   return (
//     <>
//       {/* כפתור פתיחה – רק מתחת ל-md */}
//       <button
//         onClick={() => setIsOpen(true)}
//         className={`fixed top-20 right-4 z-[60] bg-white rounded-full p-2 shadow-md transition-all duration-200 
//           md:hidden ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
//         `}
//         aria-label="פתח תפריט"
//       >
//         <div className="space-y-1">
//           <span className="block w-6 h-0.5 bg-[#1d75a1]"></span>
//           <span className="block w-6 h-0.5 bg-[#1d75a1]"></span>
//           <span className="block w-6 h-0.5 bg-[#1d75a1]"></span>
//         </div>
//       </button>

//       {/* רקע כהה */}
//       {isOpen && (
//         <div
//           className="fixed inset-0 bg-black/40 z-40"
//           onClick={() => setIsOpen(false)}
//         />
//       )}

//       {/* תפריט צד מימין */}
//       <aside
//         className={`fixed top-0 right-0 z-50 h-full bg-white w-72 max-w-full shadow-md p-6 transform transition-transform duration-300 ease-in-out 
//           ${isOpen ? 'translate-x-0' : 'translate-x-full'}
//         `}
//       >
//         {/* כפתור סגירה */}
//         <button
//           onClick={() => setIsOpen(false)}
//           className="absolute top-4 left-4 text-gray-500 hover:text-[#1d75a1] text-3xl"
//           aria-label="סגור תפריט"
//         >
//           &times;
//         </button>

//         {/* קישורים – כל אחד סוגר את התפריט */}
//         <ul className="space-y-4 mt-12 text-right">
//           <li>
//             <Link href="/home" onClick={() => setIsOpen(false)} className="block text-[#1d75a1] hover:text-[#007bff] font-bold text-[15px]">
//               בית
//             </Link>
//           </li>
//           <li>
//             <Link href="/home/about" onClick={() => setIsOpen(false)} className="block text-[#1d75a1] hover:text-[#007bff] font-bold text-[15px]">
//               אודות
//             </Link>
//           </li>
//           <li>
//             <Link href="/home/calculators" onClick={() => setIsOpen(false)} className="block text-[#1d75a1] hover:text-[#007bff] font-bold text-[15px]">
//               מחשבונים
//             </Link>
//           </li>
//           <li>
//             <Link href="/home/concepts" onClick={() => setIsOpen(false)} className="block text-[#1d75a1] hover:text-[#007bff] font-bold text-[15px]">
//               מושגים במשכנתא
//             </Link>
//           </li>
//           <li>
//             <Link href="/home/contact" onClick={() => setIsOpen(false)} className="block text-[#1d75a1] hover:text-[#007bff] font-bold text-[15px]">
//               צור קשר
//             </Link>
//           </li>
//         </ul>
//       </aside>
//     </>
//   )
// }














// "use client"
// import Link from "next/link"
// import { forwardRef, useImperativeHandle, useState, useEffect } from "react"

// export type SidebarHandle = {
//   open: () => void
// }

// const Sidebar = forwardRef<SidebarHandle>((_, ref) => {
//   const [isOpen, setIsOpen] = useState(false)

//   useImperativeHandle(ref, () => ({
//     open: () => setIsOpen(true),
//   }))

//   const closeSidebar = () => setIsOpen(false)

//   useEffect(() => {
//     document.body.style.overflow = isOpen ? 'hidden' : ''
//     return () => { document.body.style.overflow = '' }
//   }, [isOpen])

//   return (
//     <>
//       {isOpen && (
//         <div
//           className="fixed inset-0 z-40 bg-black bg-opacity-50"
//           onClick={closeSidebar}
//         />
//       )}

//       <div className={`fixed top-0 right-0 z-50 h-full w-3/4 max-w-[300px] bg-white shadow-md transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} lg:hidden`}>
//         <button
//           onClick={closeSidebar}
//           className="absolute top-4 left-4 z-50"
//         >
//           <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 fill-black" viewBox="0 0 24 24">
//             <path d="M18 6L6 18M6 6l12 12" />
//           </svg>
//         </button>

//         <ul className="mt-16 space-y-4 p-6">
//           {[
//             { href: "/home", label: "בית" },
//             { href: "/home/about", label: "אודות" },
//             { href: "/home/calculators", label: "מחשבונים" },
//             { href: "/home/concepts", label: "מושגים במשכנתא" },
//             { href: "/home/contact", label: "צור קשר" },
//             { href: "/home/schedule", label: "קבע פגישת זום", className: "text-white bg-[#1d75a1] rounded-lg px-4 py-2 block text-center" },
//             { href: "/login", label: "אזור אישי", className: "text-white bg-[#1d75a1] rounded-lg px-4 py-2 block text-center" },
//             { href: "/signup", label: "הרשמה", className: "text-white bg-[#1d75a1] rounded-lg px-4 py-2 block text-center" },
//           ].map(({ href, label, className = "" }) => (
//             <li key={href} className="border-b py-3 px-3">
//               <Link
//                 href={href}
//                 className={`hover:text-[#1d75a1] text-[#1d75a1] block font-bold text-[15px] ${className}`}
//                 onClick={closeSidebar}
//               >
//                 {label}
//               </Link>
//             </li>
//           ))}
//         </ul>
//       </div>
//     </>
//   )
// })

// Sidebar.displayName = "Sidebar"
// export default Sidebar














// 'use client'

// import Link from 'next/link'
// import { useState } from 'react'

// export default function SideMenu() {
//   const [isOpen, setIsOpen] = useState(false)

//   return (
//     <>
//       {/* כפתור פתיחה – רק מתחת ל-md */}
//       <button
//         onClick={() => setIsOpen(true)}
//         className={`fixed top-20 right-4 z-[60] bg-white rounded-full p-2 shadow-md transition-all duration-200 
//           md:hidden ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
//         `}
//         aria-label="פתח תפריט"
//       >
//         <div className="space-y-1">
//           <span className="block w-6 h-0.5 bg-[#1d75a1]"></span>
//           <span className="block w-6 h-0.5 bg-[#1d75a1]"></span>
//           <span className="block w-6 h-0.5 bg-[#1d75a1]"></span>
//         </div>
//       </button>

//       {/* רקע כהה */}
//       {isOpen && (
//         <div
//           className="fixed inset-0 bg-black/40 z-40"
//           onClick={() => setIsOpen(false)}
//         />
//       )}

//       {/* תפריט צד מימין */}
//       <aside
//         className={`fixed top-0 right-0 z-50 h-full bg-white w-72 max-w-full shadow-md p-6 transform transition-transform duration-300 ease-in-out 
//           ${isOpen ? 'translate-x-0' : 'translate-x-full'}
//         `}
//       >
//         {/* כפתור סגירה */}
//         <button
//           onClick={() => setIsOpen(false)}
//           className="absolute top-4 left-4 text-gray-500 hover:text-[#1d75a1] text-3xl"
//           aria-label="סגור תפריט"
//         >
//           &times;
//         </button>

//         {/* קישורים – כל אחד סוגר את התפריט */}
//         <ul className="space-y-4 mt-12 text-right">
//           <li>
//             <Link href="/home" onClick={() => setIsOpen(false)} className="block text-[#1d75a1] hover:text-[#007bff] font-bold text-[15px]">
//               בית
//             </Link>
//           </li>
//           <li>
//             <Link href="/home/about" onClick={() => setIsOpen(false)} className="block text-[#1d75a1] hover:text-[#007bff] font-bold text-[15px]">
//               אודות
//             </Link>
//           </li>
//           <li>
//             <Link href="/home/calculators" onClick={() => setIsOpen(false)} className="block text-[#1d75a1] hover:text-[#007bff] font-bold text-[15px]">
//               מחשבונים
//             </Link>
//           </li>
//           <li>
//             <Link href="/home/concepts" onClick={() => setIsOpen(false)} className="block text-[#1d75a1] hover:text-[#007bff] font-bold text-[15px]">
//               מושגים במשכנתא
//             </Link>
//           </li>
//           <li>
//             <Link href="/home/contact" onClick={() => setIsOpen(false)} className="block text-[#1d75a1] hover:text-[#007bff] font-bold text-[15px]">
//               צור קשר
//             </Link>
//           </li>



          
//         </ul>
//       </aside>
//     </>
//   )
// }














