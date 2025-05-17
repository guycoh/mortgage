"use client"

import {Footer}from "./components/footer";
import { Nav } from "./components/nav";
import SideMenu from "./components/sidebar_mobile";
import CurrencyTicker from "./components/CurrencyTicker";




<SideMenu
      triggerButton={(onClick, isOpen) => (
        <Nav onOpenMenu={onClick} isMenuOpen={isOpen} />
      )}
    />
export default function MuhniLayout({
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
   <CurrencyTicker  /> 
   {children}
   </main>
   <Footer/>
 
   </div>
   </>

  );

}