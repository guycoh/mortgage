"use client"

import {Footer}from "./components/footer";
import { Nav } from "./components/nav";

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