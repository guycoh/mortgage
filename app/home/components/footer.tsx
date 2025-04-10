import Link from "next/link";


export const Footer = () => {
 
  return (
    <footer className="bg-[#a39d8f] font-sans pt-12 pb-8 px-12 tracking-wide relative overflow-hidden">
     <Link href="/private/admin/dashboard" className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-md transition duration-300">
             DASHBOARD ADMIN
     </Link>
     <Link href="/private/crm" className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-md transition duration-300">
           crm
     </Link>


     
    #a39d8f
 </footer>
  )
}

