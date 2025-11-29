
"use client"

import { Footer } from "./components/footer";
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
      <div className="min-h-screen flex flex-col">
        {/* תפריט צד נייד וניווט עליון */}
        <SideMenu
          triggerButton={(onClick, isOpen) => (
            <Nav onOpenMenu={onClick} isMenuOpen={isOpen} />
          )}
        />

        {/* סרגל יצירת קשר */}
        <ContactBar />

        <main className="flex-grow">{children}</main>
        <Footer />
      </div>
    </>
  );
}
