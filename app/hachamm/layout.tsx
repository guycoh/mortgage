"use client"
import Navbar from "./components/Nav";




export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
       <Navbar/>

<div className="mt-2">

   

 {children}

</div>
   
 
    </>
  );
}
