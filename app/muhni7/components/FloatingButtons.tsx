import Link from "next/link";
import CalendarIcon from "@/public/assets/images/svg/general/CalendarIcon";
import WhatsappIcon from "@/public/assets/images/svg/whatsapp";

export default function FloatingButtons() {
  return (
    <aside className="flex flex-col items-center gap-[10px] sticky top-36 w-16 md:w-auto z-30 ">
      <div className="flex flex-col items-center w-16 mt-8 ml-4">
        <button className="w-16 h-16 bg-white flex justify-center items-center rounded-full border border-[#6929AC] bg-transparent shadow-md hover:shadow-lg active:scale-95 transition-all duration-200 ease-out focus:outline-none focus:ring-4 focus:ring-[#6929AC]/30">
          <WhatsappIcon size={38} color="#6929AC" />
        </button>
        <span className="mt-1 text-xs text-[#6929AC] text-center w-full">צ'אט עם יועץ</span>
      </div>

      <div className="flex flex-col items-center w-16 ml-4">
        <Link href="/muhni7/schedule">
          <button className="w-16 h-16 bg-white flex justify-center items-center rounded-full border border-[#6929AC] bg-transparent shadow-md hover:shadow-lg active:scale-95 transition-all duration-200 ease-out focus:outline-none focus:ring-4 focus:ring-[#6929AC]/30">
            <CalendarIcon size={38} color="#6929AC" />
          </button>
        </Link>
        <span className="mt-1 text-xs text-[#6929AC] text-center w-full">קבע פגישה</span>
      </div>
    </aside>
  );
}
