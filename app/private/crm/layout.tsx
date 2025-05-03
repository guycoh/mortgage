'use client'

import CrmNav from "./components/crm_nav";

export default function CrmLayout({
  children,


}:{
  children:React.ReactNode;
}
){
  return (
  <>
 <div className="min-h-screen bg-gray-100">
      <CrmNav/>


          {children}
       
  </div>
   </>

  );
}