"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./components/footer";
import { Nav } from "./components/nav";
import SideMenu from "./components/sidebar_mobile";
import CurrencyTicker from "./components/CurrencyTicker";
import FloatingButtons from "./components/FloatingButtons";
import MobileFooter from "./components/MobileFooter";

export default function MuhniLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const pagesWithoutSidebar = ["/login", "/admin", "/contact"];
  const showSidebar = !pagesWithoutSidebar.some((path) =>
    pathname.startsWith(path)
  );

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      {/* תפריט צד נייד וניווט עליון */}
      <SideMenu
        triggerButton={(onClick, isOpen) => (
          <Nav onOpenMenu={onClick} isMenuOpen={isOpen} />
        )}
      />

      <CurrencyTicker />

      {/* תוכן הדף עם סרגל צד שמאלי */}
      <main className="flex-grow grid grid-cols-1 md:grid-cols-[1fr_60px] gap-4 px-1 bg-galbg">
        {/* תוכן הדף */}
        <div>{children}</div>

        {/* סרגל צד שמאלי */}
        {showSidebar ? (
          <div className="hidden md:flex flex-col items-center bg-transparent">
            <FloatingButtons />
          </div>
        ) : (
          <div className="hidden md:block" />
        )}
      </main>

      <Footer />
     <MobileFooter />
    </div>
  );
}








// "use client"

// import {Footer}from "./components/footer";
// import { Nav } from "./components/nav";
// import SideMenu from "./components/sidebar_mobile";
// import CurrencyTicker from "./components/CurrencyTicker";

// <SideMenu
//       triggerButton={(onClick, isOpen) => (
//         <Nav onOpenMenu={onClick} isMenuOpen={isOpen} />
//       )}
//     />
// export default function MuhniLayout({
//   children,


// }:{
//   children:React.ReactNode;
// }
// ){
//   return (
//   <>
//   <div className="min-h-screen flex flex-col">
  
//    <main className="flex-grow">
//    <SideMenu
//       triggerButton={(onClick, isOpen) => (
//         <Nav onOpenMenu={onClick} isMenuOpen={isOpen} />
//       )}
//     />
//    <CurrencyTicker  /> 
//    {children}
//    </main>
//    <Footer/>
 
//    </div>
//    </>

//   );

// }