
"use client"
import SideMenu from "./components/sidebar_mobile";
import { Nav } from "./components/nav";
import ContactBar from "./components/ContactBar";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
        {/* תפריט צד נייד וניווט עליון */}
        <SideMenu
          triggerButton={(onClick, isOpen) => (
            <Nav onOpenMenu={onClick} isMenuOpen={isOpen} />
          )}
        />

        {/* סרגל יצירת קשר */}
        <ContactBar />

    {children}
     
 
    </>
  );
}
