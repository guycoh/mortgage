'use client'


import {Footer}from "./components/footer";


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
   {children}
   </main>
   <Footer/>
 
   </div>
   </>

  );



}