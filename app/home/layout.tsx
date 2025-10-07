"use client"

import {Footer}from "./components/footer";
import Nav from "./components/nav";

import SideMenu from "./components/sidebar_mobile";


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
       
        <Nav/>
     
   {children}
   </main>
   <Footer/>
 
   </div>
   </>

  );

}