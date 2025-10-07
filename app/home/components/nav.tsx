"use client";

import Link from "next/link";
import CustomIcon from "@/public/assets/images/svg/general/CustomIcon";

export const Nav = ({ onOpenMenu, isMenuOpen }: { onOpenMenu: () => void, isMenuOpen: boolean }) => {
  
//export default function Nav() {
  const links = [
    { href: "/home", label: "בית" },
    { href: "/home/calculators", label: "מחשבונים" },
    { href: "/home/concepts", label: "מושגים במשכנתא" },
    { href: "/home/contact", label: "צור קשר" },
    { href: "/home/about", label: "אודות" },
  ];

  return (
    <header className="w-full ">
    <div className="relative">
      <CustomIcon
            size={140}
            color="white"
            className="absolute z-50 -top-6 left-0" // ממקם את האייקון ממש למעלה-ימין
          />
    
      {/* כפתור המבורגר */}
          <button
            onClick={onOpenMenu}
            className={`md:hidden absolute top-4 right-4 z-[60] bg-white rounded-full p-4 shadow-md transition-all duration-200
              ${isMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
            `}
            aria-label="פתח תפריט"
          >
            <div className="space-y-1">
              <span className="block w-6 h-0.5 bg-main"></span>
              <span className="block w-6 h-0.5 bg-main"></span>
              <span className="block w-6 h-0.5 bg-main"></span>
            </div>
          </button>








      {/* רקע ניווט עם תלת-ממד */}
     
     
      <div
      
        className="w-full h-28 relative overflow-hidden shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
        style={{
          transform: "translateZ(0)",
          borderBottom: "none",
        }}
      >
        {/* שכבות רקע תלת-ממדיות */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b2f42] via-[#166083] to-[#38c5e0] opacity-95"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.15),transparent)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.08),transparent)]"></div>

        {/* תוכן התפריט */}
  
      <div className="relative z-10 flex justify-between items-start h-full px-12 font-semibold text-white pt-4">
       
        {/* תפריט בצד שמאל */}
        <nav className="flex gap-10 text-lg">
       
          {links.map(({ href, label }) => (
          
            <Link
              key={href}
              href={href}
              className=" max-lg:hidden lg:!block     relative hover:text-cyan-200 transition duration-300 before:absolute before:-bottom-2 before:left-0 before:w-0 before:h-[3px] before:bg-cyan-200 before:transition-all before:duration-300 hover:before:w-full"
            >
              {label}
            </Link>
         
          ))}
      
        </nav>

  {/* לוגו / אייקון בצד ימין - בחלק העליון */}
  <div className="relative">
  
  </div>
      </div>




        {/* אפקט "שולחן" תלת-ממדי מתחת לניווט */}
        <div className="absolute bottom-0 left-0 w-full h-10 bg-gradient-to-b from-[#0b2f42] to-transparent shadow-inner"></div>
      </div>
  
  
  </div>
    </header>
  );
}


















// "use client"
// import Link from "next/link"
// import UserInfo from "./logoutButton"


// export const Nav = ({ onOpenMenu, isMenuOpen }: { onOpenMenu: () => void, isMenuOpen: boolean }) => {
//   return (
//     <div>
//       <header className="shadow-md font-sans tracking-wide relative z-50">

//        {/* פס עליון */}
//         <section className="py-2 bg-[#1d75a1] text-[#e5e4e3] px-10 flex justify-center items-center">
//           <p className="text-sm text-center">
//             <strong className="mx-3">מורגי - המרכז הישראלי למשכנתא ופיננסים</strong>
//           </p>
//         </section>

//         {/* אזור תפריט */}
//         <div className="flex flex-wrap items-center justify-between gap-4 px-10 py-4 bg-[#e5e4e3] min-h-[70px] relative">

//           {/* כפתור המבורגר */}
//           <button
//             onClick={onOpenMenu}
//             className={`md:hidden absolute top-4 right-4 z-[60] bg-white rounded-full p-4 shadow-md transition-all duration-200
//               ${isMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
//             `}
//             aria-label="פתח תפריט"
//           >
//             <div className="space-y-1">
//               <span className="block w-6 h-0.5 bg-[#1d75a1]"></span>
//               <span className="block w-6 h-0.5 bg-[#1d75a1]"></span>
//               <span className="block w-6 h-0.5 bg-[#1d75a1]"></span>
//             </div>
//           </button>

//           {/* תפריט ניווט */}
//           <div className="max-lg:hidden lg:!block">
//             <ul className="flex gap-x-6">
//               <li><Link href="/home" className="text-[#1d75a1] font-bold text-[15px]">בית</Link></li>
//               <li><Link href="/home/about" className="text-[#1d75a1] font-bold text-[15px]">אודות</Link></li>
//               <li><Link href="/home/calculators" className="text-[#1d75a1] font-bold text-[15px]">מחשבונים</Link></li>
//               <li><Link href="/home/concepts" className="text-[#1d75a1] font-bold text-[15px]">מושגים במשכנתא</Link></li>
//               <li><Link href="/home/contact" className="text-[#1d75a1] font-bold text-[15px]">צור קשר</Link></li>
//               <li>
//                 <Link href="/home/schedule" className="text-white bg-[#1d75a1] rounded-lg text-sm px-5 py-2.5">קבע פגישה</Link>
//               </li>
//               <li>
//                 <Link href="/login" className="text-white bg-[#1d75a1] rounded-lg text-sm px-5 py-2.5">אזור אישי</Link>
//               </li>
//               <li>
//                 <Link href="/register" className="text-white bg-[#1d75a1] rounded-lg text-sm px-5 py-2.5">הרשמה</Link>
//               </li>
//               <li>
//                 <UserInfo />
//               </li>
            
            
//             </ul>
//           </div>
//         </div>
//       </header>
//     </div>
//   )
// }








