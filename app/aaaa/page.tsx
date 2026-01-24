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
import SigmaIcon from "@/public/assets/images/svg/SigmaIcon";

import WazeIcon from "@/public/assets/images/svg/waze_icon";
import CalendarIcon from "@/public/assets/images/svg/general/CalendarIcon";


export default function WhatsAppBusinessCard() {

  /* =========================
     נתוני הכרטיס – כאן עורכים
     ========================= */
  const advisor = {
    name: "גיא כהן",
    role: "יועץ משכנתאות",
    phone: "050-1234567",
    address: "תל אביב",
    website: "https://morgi.co.il",
  }


    /* =========================
    צבעי מיתוג – החלפה חופשית
    ========================= */
    const theme = {
    primary: "#2563EB",   // כחול דומיננטי
    secondary: "#F7F5F0", // לבן קרמי
    }




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



    const generateVCard = () => {
    const vcard = `
    BEGIN:VCARD
    VERSION:3.0
    N:${advisor.name};;;
    FN:${advisor.name}
    ORG:${advisor.role}
    TEL;TYPE=CELL:${advisor.phone}
    ADR;TYPE=WORK:;;${advisor.address}
    URL:${advisor.website}
    END:VCARD
    `.trim()

    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.download = `${advisor.name}.vcf`
    link.click()

    URL.revokeObjectURL(url)
    }




  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100">

      {/* כרטיס */}
     <div
        className="
            relative
            w-full
            h-screen

            md:w-[390px]
            md:h-[760px]

            lg:w-[390px]
            lg:h-[760px]

            flex
            flex-col
            bg-white
            overflow-hidden

            md:rounded-2xl
        "
        >


        {/* HEADER */}
        <div className="h-[24%]" style={{ backgroundColor: theme.secondary }} />

        {/* BODY */}
        <div  style={{ backgroundColor: theme.primary}}  className="flex-1 px-5 py-6 flex flex-col gap-6">

          {/* שם + תפקיד */}
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900">
              {advisor.name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {advisor.role}
            </p>
          </div>

          {/* רצועה 1 – כפתורי פעולה */}
<div className="grid grid-cols-4 gap-4">
  {buttons.map((btn, i) => {
    const Icon = btn.icon

    return (
      <a
        key={i}
        href={btn.href}
        className="flex flex-col items-center gap-2"
      >
        {/* כפתור עגול */}
        <div
          className="
            aspect-square
            w-full
            rounded-full
            bg-white

            shadow-[6px_6px_12px_rgba(0,0,0,0.25),-6px_-6px_12px_rgba(255,255,255,0.9)]
            flex
            items-center
            justify-center

            transition
            active:scale-95
          "
        >
          <Icon className="w-6 h-6 text-gray-800" />
        </div>

        {/* כיתוב */}
        <span className="text-xs font-medium text-white">
          {btn.label}
        </span>
      </a>
    )
  })}
</div>


          {/* רצועה 2 – גלילה באצבע בלבד, 4 נראים */}
          <div
            className="
              overflow-x-auto
              [-ms-overflow-style:none]
              [scrollbar-width:none]
              [&::-webkit-scrollbar]:hidden
            "
          >
            <div className="grid grid-flow-col auto-cols-[calc((100%-3*1rem)/4)] gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <button
                  key={i}
                  className="
                    aspect-square
                    rounded-xl
                    bg-gradient-to-br from-gray-200 to-gray-400
                    shadow-[4px_4px_8px_rgba(0,0,0,0.3),-4px_-4px_8px_rgba(255,255,255,0.25)]
                  "
                />
              ))}
            </div>
          </div>

        </div>

        {/* כפתור עגול – הוספה לאנשי קשר */}
       <button
            onClick={generateVCard}
            className="
                absolute
                left-1/2
                bottom-[16%]
                -translate-x-1/2
                translate-y-1/2

                w-20
                h-20
                rounded-full
                bg-white

                shadow-[0_14px_28px_rgba(0,0,0,0.35)]
                flex
                flex-col
                items-center
                justify-center

                font-semibold
                text-gray-800
                select-none

                transition-all
                duration-150
                active:translate-y-[55%]
                active:shadow-[0_6px_12px_rgba(0,0,0,0.35)]
                active:scale-[0.96]
            "
            >
            <span className="text-xl leading-none">＋</span>
            <span className="text-[11px] mt-0.5">
                הוספה
            </span>
            </button>

        {/* FOOTER */}
        <div className="h-[16%] bg-[#F7F5F0] flex items-center justify-center">
          <span className="text-blue-400 font-semibold">
            {advisor.address}
          </span>
        </div>

      </div>
    </div>
  )
}
