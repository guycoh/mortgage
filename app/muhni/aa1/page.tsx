'use client'

import EmailIcon from "public/assets/images/svg/EmailIcon";
import Calculator1 from "public/assets/images/svg/Calculator1";
import Calculator2 from "public/assets/images/svg/Calculator2";
import Calculator3 from "public/assets/images/svg/Calculator3";
import Calculator4 from "public/assets/images/svg/Calculator4";
import Phone from "@/public/assets/images/svg/phone";
import WebIcon from "@/public/assets/images/svg/webIcon";
import WhatsappIcon from "@/public/assets/images/svg/whatsapp";
import WazeIcon from "@/public/assets/images/svg/waze";
import LocationIcon from "@/public/assets/images/svg/location";

import Link from 'next/link';



export default function Cube3D() {
  const buttons = [
    { icon: <Phone size={40} />, label: 'התקשר', href: 'tel:0500000000' },
    { icon: <EmailIcon size={40} />, label: 'שלח מייל', href: 'mailto:test@example.com' },
    { icon: <WhatsappIcon size={40} />, label: 'ווצאפ', href: '/about' },
    { icon: <WebIcon size={40} />, label: 'אתר', href: '/map' },
  ];

  return (
 
    <div className="w-full flex justify-center bg-gray-100 py-8 px-4">
      <div className="grid grid-cols-4 gap-4 max-w-md">
        {buttons.map((btn, idx) => (
          <a
            key={idx}
            href={btn.href}
            target={btn.href.startsWith('http') || btn.href.startsWith('mailto') || btn.href.startsWith('tel') ? '_blank' : '_self'}
            rel="noopener noreferrer"
            className="group w-20 h-20 bg-white border-2 border-gray-300 rounded-xl shadow-md hover:shadow-xl hover:border-orange-500 transition-all duration-300 ease-in-out flex flex-col items-center justify-center relative overflow-hidden text-center"
          >
            <div className="transition-transform duration-500 group-hover:rotate-[15deg] group-hover:scale-110 z-10 text-[#7e22ce] group-hover:text-orange-500">
              {btn.icon}
            </div>
            <span className="mt-1 text-xs font-medium text-gray-700 group-hover:text-orange-500 z-10 transition-colors duration-300">
              {btn.label}
            </span>
            <span className="absolute inset-0 bg-orange-100 opacity-0 group-hover:opacity-60 transition-opacity duration-500 z-0" />
          </a>
        ))}
      </div>
    </div>
  );
}

   





