'use client'
//import { Nav_admin } from "./components/nav_admin";
import Sidebar_admin from "./components/sidebar_admin";
import Nav_admin from "./components/nav_admin";


export default function AdminLayout({
  children,


}:{
  children:React.ReactNode;
}
){
  return (
  <>
 <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <Nav_admin />



 {/* Main Content with Sidebar */}
 <div className="relative">
        <Sidebar_admin/>
        <main className="flex-grow p-8 text-right">
          {children}
        </main>
 </div>

  </div>
   </>

  );



}