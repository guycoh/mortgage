import Link from "next/link";
import CalendarIcon from "@/public/assets/images/svg/general/CalendarIcon";

import { useUser } from "@/app/context/UserContext";




export default function FloatingButtons() {
  const { role, isLoading } = useUser();

 
 
  return (
    <aside className="flex flex-col items-center gap-[10px] sticky top-36 w-16 md:w-auto z-30 ">
    
      <div className="flex flex-col items-center w-16 ml-4 mt-2">
        <Link href="/muhni/schedule">
          <button className="w-16 h-16 bg-white flex justify-center items-center rounded-full border border-main bg-transparent shadow-md hover:shadow-lg active:scale-95 transition-all duration-200 ease-out focus:outline-none focus:ring-4 focus:ring-[#6929AC]/30">
            <CalendarIcon size={38} color="#1d75a1" />
          </button>
        </Link>
        <span className="mt-1 text-xs text-main text-center w-full">קבע פגישה</span>
      </div>
    
     {role === 'admin' && (
      <>
       <div className="flex flex-col items-center w-16 ml-4">
            <Link href="/private/crm">
              <button className="w-16 h-16 text-[#1d75a1] bg-white flex justify-center items-center rounded-full border border-main bg-transparent shadow-md hover:shadow-lg active:scale-95 transition-all duration-200 ease-out focus:outline-none focus:ring-4 focus:ring-[#6929AC]/30">
              CRM
              </button>
            </Link>          
        </div>
       <div className="flex flex-col items-center w-16 ml-4">
        <Link href="/private/admin">
          <button className="w-16 h-16 text-main bg-white flex justify-center items-center rounded-full border border-main bg-transparent shadow-md hover:shadow-lg active:scale-95 transition-all duration-200 ease-out focus:outline-none focus:ring-4 focus:ring-[#6929AC]/30">
           ADMIN
          </button>
        </Link>       
        </div>
      
      </>
    
      )}
    
      {role === 'modifier' && (
          <div className="flex flex-col items-center w-16 ml-4">
            <Link href="/private/crm">
              <button className="w-16 h-16 text-#1d75a1 bg-white flex justify-center items-center rounded-full border border-[#6929AC] bg-transparent shadow-md hover:shadow-lg active:scale-95 transition-all duration-200 ease-out focus:outline-none focus:ring-4 focus:ring-[#6929AC]/30">
              CRM
              </button>
            </Link>
          
        </div>
      )}





    
    
    
    
    
    
    
    </aside>
  );
}
