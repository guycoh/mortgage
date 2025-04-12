"use client"

import {Footer}from "./components/footer";
import { Nav } from "./components/nav";
import SideMenu from "./components/sidebar_mobile";

<SideMenu
      triggerButton={(onClick, isOpen) => (
        <Nav onOpenMenu={onClick} isMenuOpen={isOpen} />
      )}
    />
export default function HomeLayout({
  children,


}:{
  children:React.ReactNode;
}
){
  return (
  <>
  <div className="min-h-screen flex flex-col">
  
   <main className="flex-grow">
   <SideMenu
      triggerButton={(onClick, isOpen) => (
        <Nav onOpenMenu={onClick} isMenuOpen={isOpen} />
      )}
    />
   {children}
   </main>
   <Footer/>
 
   </div>
   </>

  );



}