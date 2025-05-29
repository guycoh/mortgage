// components/FloatingButtons.tsx
"use client";

import CalendarIcon from "@/public/assets/images/svg/general/CalendarIcon";
import WhatsappIcon from "@/public/assets/images/svg/whatsapp";

export default function FloatingButtons() {
  return (
    <aside className="hidden md:flex flex-col items-center gap-[10px] px-2 py-6 w-20 sticky top-36 self-start z-30">
      <div className="flex flex-col items-center w-16">
        <button className="w-16 h-16 flex justify-center items-center rounded-full border border-[#6929AC] bg-white shadow-md hover:shadow-lg active:scale-95 transition-all duration-200 ease-out focus:outline-none focus:ring-4 focus:ring-[#6929AC]/30">
          <WhatsappIcon size={38} color="#6929AC" />
        </button>
        <span className="mt-2 text-sm text-[#6929AC] text-center w-full">צ'אט עם יועץ</span>
      </div>

      <div className="flex flex-col items-center w-16">
        <button className="w-16 h-16 flex justify-center items-center rounded-full border border-[#6929AC] bg-white shadow-md hover:shadow-lg active:scale-95 transition-all duration-200 ease-out focus:outline-none focus:ring-4 focus:ring-[#6929AC]/30">
          <CalendarIcon size={38} color="#6929AC" />
        </button>
        <span className="mt-2 text-sm text-[#6929AC] text-center w-full">קבע פגישה</span>
      </div>
    </aside>
  );
}

