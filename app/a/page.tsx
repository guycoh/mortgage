"use client";

import Image from "next/image";
import Link from "next/link";

import ContactButton from "./ContactButton";


import PhoneIcon from "@/public/assets/images/svg/contact/PhoneIcon";
import WhatsappIcon from "@/public/assets/images/svg/contact/WhatsappIcon";
import EnvelopeIcon from "@/public/assets/images/svg/contact/EnvelopeIcon";
import GlobeIcon from "@/public/assets/images/svg/contact/GlobeIcon";


import Calculator5 from "public/assets/images/svg/Calculator5";
import Calculator2 from "public/assets/images/svg/Calculator2";
import Calculator3 from "public/assets/images/svg/Calculator3";
import SigmaIcon from "@/public/assets/images/svg/SigmaIcon";

import WazeIcon from "@/public/assets/images/svg/waze_icon";


export default function BusinessCard() {
 
  const buttons = [
    { icon: PhoneIcon, label: "טלפון", href: 'tel:0503466591' },
    { icon: WhatsappIcon, label: "צ׳אט", href: 'https://wa.me/972503466591' },
    { icon: EnvelopeIcon, label: "דוא\"ל", href: 'mailto:guy.c@primeinv.co.il' },
    { icon: GlobeIcon, label: "אתר", href: "https://primeinv.co.il/" },
  ];
  const calculators = [
    { icon: Calculator5, label: "מחשבון מהיר", href: "/home/calculators/simple_calculator" },
    { icon: Calculator2, label: "מחשבון יכולות", href: "/home/calculators/mortgage_capability" },
    { icon: Calculator3, label: "מס רכישה", href: "/home/calculators/purchase_tax_calculator" },
    { icon: SigmaIcon, label: "מחשבון משכנתא", href: "/home/calculators/mortgage_calculator" },
  ];
 
  
 
  return (
  <div className="min-h-screen flex flex-col bg-blue-600">

   
    {/* HEADER - לבן עם לוגו */}
    
{/* HEADER - פרימיום */}
<div className="relative h-44 sm:h-52 flex items-center justify-center overflow-hidden">

  {/* רקע גרדיאנט עמוק */}
  <div className="absolute inset-0
   bg-white" />

  {/* שכבת אור עדינה */}
  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,white,transparent_60%)]" />

  {/* לוגו */}
  <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10">
    <Image
      src="/assets/images/imgFiles/prime.jpg"
      alt="logo"
      width={260}
      height={100}
      className="object-contain max-h-24 w-auto drop-shadow-lg"
      priority
    />
  </div>

  {/* קו תחתון מותג */}
  <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-white/60 to-transparent" />

  {/* תמונת פרופיל */}
  <div className="absolute left-1/2 -translate-x-1/2 top-full -translate-y-1/2 z-20">
    <div className="relative">
      <Image
        src="/assets/images/imgFiles/guy_cohen2.jpg"
        alt="avatar"
        width={130}
        height={130}
        className="rounded-full border-[5px] border-white shadow-2xl"
      />

      {/* הילה עדינה */}
      <div className="absolute inset-0 rounded-full bg-white opacity-10 blur-xl scale-110" />
    </div>
  </div>

</div>


    {/* BODY */}
    <div className="font-shmulik 
      flex-1 flex flex-col items-center justify-start pt-16 pb-8 px-6 text-center text-white 
      bg-linear-to-br from-[#0b2f42] via-[#145374] to-[#1d75a1]">

     <div className="mt-5">
      <h1 className="text-5xl font-bold">
        גיא כהן
      </h1>

      <p className="text-2xl opacity-90 mt-1">
        יועץ משכנתאות
      </p>
     </div>
       {/* כפתורים */}
      
       {/* — יצירת קשר — */}
        <div className="w-full flex justify-center mt-10">
          <div className="w-full max-w-5xl px-2">
            <div className="grid grid-cols-4 gap-x-8 gap-y-6 place-items-center">
              {buttons.map((btn, idx) => (
                <div key={idx} className="relative flex flex-col items-center">
                  <a
                    href={btn.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-white shadow hover:shadow-lg transition
                            w-[72px] h-[72px] sm:w-20 sm:h-20 flex items-center justify-center"
                  >
                    <div className="bg-gray-50 border border-gray-200 rounded-full
                                    w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center">
                      <btn.icon color="#1d75a1" className="w-7 h-7 sm:w-9 sm:h-9" />
                    </div>
                  </a>
                  <span className="absolute top-full mt-2 text-xs sm:static sm:mt-3
                                  sm:text-sm font-medium text-white text-center whitespace-nowrap">
                    {btn.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* — מחשבוני משכנתא — */}
        <div className="w-full flex justify-center mt-10">
          <div className="w-full max-w-5xl px-2">
            <div className="grid grid-cols-4 gap-x-8 gap-y-6 place-items-center">
              {calculators.map((item, idx) => (
                <div key={idx} className="relative flex flex-col items-center">
                  <Link
                    href={item.href}
                    className="rounded-md bg-white shadow hover:shadow-lg transition
                              w-18 h-8 sm:w-20 sm:h-20 flex items-center justify-center"
                  >
                    <div className="bg-gray-50 border border-gray-200 rounded-md
                                    w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center">
                      <item.icon color="#1d75a1" className="w-7 h-7 sm:w-9 sm:h-9" />
                    </div>
                  </Link>
                  <span className="absolute top-full mt-2 text-xs sm:static sm:mt-3
                                  sm:text-sm font-medium text-white text-center whitespace-nowrap">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>


    </div>

    {/* FOOTER */}
    <div className="bg-white text-[#1d75a1] text-sm py-8 px-4 text-right">
      <div className="flex items-center justify-center gap-4">

        {/* טקסט */}
        <div className="flex flex-col text-right">
          <p className="font-medium text-lg">רחוב מצדה 7, בני ברק</p>
          <p className="font-medium text-lg">בניין בסר 4, קומה 7</p>
        </div>

        {/* אייקון וויז */}
        <a
          href="waze://?ll=32.093649,34.824629&navigate=yes"
          className="relative group w-[52px] h-[52px] flex items-center justify-center rounded-full border border-[#1d75a1]"
        >
          <WazeIcon size={42} color="#1d75a1" className="z-10" />
          <span className="absolute inset-0 bg-orange-100 opacity-0 group-hover:opacity-60 transition-opacity duration-500 rounded-full" />
        </a>

      </div>
    </div>

  </div>
);
}