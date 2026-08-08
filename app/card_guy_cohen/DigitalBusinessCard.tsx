
"use client"

import Image from "next/image";
import Link from "next/link";

import PhoneIcon from "@/public/assets/images/svg/contact/PhoneIcon";
import WhatsappIcon from "@/public/assets/images/svg/contact/WhatsappIcon";
import EnvelopeIcon from "@/public/assets/images/svg/contact/EnvelopeIcon";
import GlobeIcon from "@/public/assets/images/svg/contact/GlobeIcon";

import Calculator5 from "public/assets/images/svg/Calculator5";
import Calculator2 from "public/assets/images/svg/Calculator2";
import Calculator3 from "public/assets/images/svg/Calculator3";
import Calculator8 from "@/public/assets/images/svg/Calculator8";
import SigmaIcon from "@/public/assets/images/svg/SigmaIcon";
import ReverseIcon from "@/public/assets/images/svg/calculators/calculatorerverse";

import WazeIcon from "@/public/assets/images/svg/waze_icon";

export default function BusinessCard() {
  
  const buttons = [
    { icon: PhoneIcon, label: "טלפון", href: 'tel:0549668335' },
    { icon: WhatsappIcon, label: "צ׳אט", href: 'https://wa.me/972549668335' },
    { icon: EnvelopeIcon, label: "דוא\"ל", href: 'mailto:guy@hachamm.com' },
    { icon: GlobeIcon, label: "אתר", href: "https://www.hachamm.co.il/" },
  ];
  
  const calculators = [
    { icon: Calculator5, label: "מחשבון מהיר", href: "/hachamm/calculators/simple_calculator" },
    { icon: Calculator2, label: "מחשבון יכולות", href: "/hachamm/calculators/mortgage_capability" },
    { icon: Calculator3, label: "מס רכישה", href: "/hachamm/calculators/purchase_tax_calculator" },
    { icon: ReverseIcon, label: "מחשבון הפוכה", href: "/hachamm/calculators/reverse_calculator" },
    { icon: Calculator8, label: "קרן שווה", href: "/hachamm/calculators/equal_principal" },
    { icon: SigmaIcon, label: "מחשבון משכנתא", href: "/hachamm/calculators/mortgage_calculator" },
  ];

  return (
    <div className="h-screen md:h-auto md:min-h-screen w-screen flex justify-center bg-white overflow-hidden md:overflow-y-auto select-none font-shmulik">
      
      {/* מעטפת הכרטיס */}
      <div className="w-full md:w-1/2 h-full md:min-h-screen flex flex-col bg-[#9a8b38] relative overflow-hidden md:overflow-visible">
        
        {/* HEADER */}
        <div className="relative h-36 md:h-48 bg-white shrink-0 z-40 flex items-center justify-center">
          {/* לוגו */}
          <div className="absolute top-4 left-4 z-10">
            <Image
              src="/hachamm/logo.svg"
              alt="logo"
              width={264}
              height={96}
              className="object-contain max-h-20 md:max-h-24 w-auto"
              priority
            />
          </div>

          {/* תמונת פרופיל */}
          <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%-53px)] z-50">
            <div className="relative">
              <Image
                src="/assets/images/imgFiles/my_image.jpg"
                alt="avatar"
                width={160}
                height={160}
                className="rounded-full border-[5px] border-white shadow-2xl object-cover w-40 h-40"
              />
              <div className="absolute inset-0 rounded-full bg-white opacity-10 blur-xl scale-110" />
            </div>
          </div>
        </div>

        {/* BODY - פיזור אלמנטים אנכי יציב באמצעות gap-y */}
        <div className="relative flex-1 flex flex-col items-center justify-start pt-28 pb-16 px-6 text-center text-white 
                        bg-linear-to-br from-[#5b4e19] via-[#9a8b38] to-[#d4c674] overflow-hidden md:overflow-visible md:pb-28 z-20 gap-y-4 md:gap-y-6">

          {/* שם ותפקיד */}
          <div className="shrink-0">
            <h1 className="text-3xl md:text-4xl font-bold tracking-wide">גיא כהן</h1>
            <p className="text-xl md:text-2xl opacity-90 mt-0.5">יועץ משכנתאות</p>
          </div>

          {/* מעטפת מאוחדת חדשה לכפתורי הקשר והמחשבונים - שומרת על מרחק אנכי קבוע ומדויק */}
          <div className="w-full flex flex-col items-center gap-y-4 md:gap-y-6 shrink-0">
            
            {/* כפתורי קשר */}
            <div className="w-full flex justify-center py-1">
              <div className="w-full max-w-5xl px-2">
                <div className="grid grid-cols-4 gap-x-3 place-items-center">
                  {buttons.map((btn, idx) => (
                    <div key={idx} className="flex flex-col items-center w-[64px] md:w-22">
                      <a
                        href={btn.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-14 h-14 md:w-18 md:h-18 rounded-full bg-white shadow flex items-center justify-center transition-transform active:scale-95"
                      >
                        <div className="w-11 h-11 md:w-15 md:h-15 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center">
                          <btn.icon color="#9a8b38" className="w-6 h-6 md:w-9 sm:h-9" />
                        </div>
                      </a>
                      <span className="mt-1 text-xs md:text-sm text-white text-center whitespace-nowrap opacity-95">
                        {btn.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* רצועת מחשבונים */}
            <div className="w-full flex flex-col items-center">
              <div className="w-full max-w-5xl px-2 overflow-x-auto overflow-y-hidden no-scrollbar">
                <div className="flex flex-nowrap gap-x-5 w-max pb-1 px-4">
                  {calculators.map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center w-[62px] md:w-22 shrink-0">
                      <Link
                        href={item.href}
                        className="w-14 h-14 md:w-18 md:h-18 rounded-md bg-white shadow flex items-center justify-center transition-transform active:scale-95"
                      >
                        <div className="w-11 h-11 md:w-15 md:h-15 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center">
                          <item.icon color="#9a8b38" className="w-6 h-6 md:w-9 sm:h-9" />
                        </div>
                      </Link>
                      <span className="mt-1 text-[11px] md:text-xs text-white whitespace-nowrap text-center opacity-95">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* קו חצים ישר וחלק */}
              <div className="flex items-center justify-between w-[75%] mt-2 text-white text-[12px] md:hidden select-none px-1">
                <span>❮</span>
                <div className="flex-1 mx-2 border-b border-solid border-white h-0" />
                <span>❯</span>
              </div>
            </div>

          </div>

        </div>

        {/* FOOTER + כפתורים צפים */}
        {/* שונה ה-padding העליון בנייד מ-pt-14 ל-pt-11 כדי לצמצם את המרחק לכתובת */}
        <div className="relative bg-white text-[#9a8b38] pt-10 pb-5 md:py-10 px-4 text-right shrink-0 z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          
          {/* כפתורים צפים - 2/3 בגוף ו-1/3 בפוטר, תמיד גלויים ב-z-50 */}        
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[66%] z-50 flex items-center justify-center gap-12 md:gap-16 w-full px-4">
            
            {/* אנשי קשר */}
            <a
              href="/contacts/guy-co-hen.vcf"
              download="guy-cohen.vcf"
              className="relative w-24 h-24 md:w-28 md:h-28 rounded-full bg-white shadow-[0_8px_20px_rgba(0,0,0,0.25)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 shrink-0"
            >
              <div className="absolute inset-0 rounded-full border-4 border-[#9a8b38]" />
              <div className="flex flex-col items-center justify-center text-[#9a8b38] z-10 text-center leading-tight">
                <span className="text-sm font-bold">הוסף</span>
                <span className="text-sm font-bold">לאנשי</span>
                <span className="text-sm font-bold">קשר</span>
              </div>
            </a>

            {/* מדריך יתרות */}
            <Link
              href="/hachamm/guide/mortgage_balance"
              className="relative w-24 h-24 md:w-28 md:h-28 rounded-full bg-white shadow-[0_8px_20px_rgba(0,0,0,0.25)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 shrink-0"
            >
              <div className="absolute inset-0 rounded-full border-4 border-[#9a8b38]" />
              <div className="flex flex-col items-center justify-center text-[#9a8b38] z-10 text-center px-1 leading-tight">
                <span className="text-sm font-bold">מדריך</span>
                <span className="text-sm font-bold">הנפקת</span>
                <span className="text-sm font-bold">דוח יתרות</span>
              </div>
            </Link>

          </div>

          {/* תוכן הפוטר */}
          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-col text-right">
              <p className="font-medium text-xl md:text-2xl">רחוב דרך מנחם בגין 144,</p>
              <p className="font-medium text-xl md:text-2xl">תל אביב</p>
            </div>
            <a
             href="waze://?q=מנחם%20בגין%20144%20תל%20אביב&navigate=yes"      
              className="relative group w-18 h-18 flex items-center justify-center rounded-full border border-[#9a8b38] shrink-0"
            >
              <WazeIcon size={52} color="#9a8b38" className="z-10" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}












