
"use client";

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




export default function DigitalBusinessCard() {
  const buttons = [
    { icon: PhoneIcon, label: "טלפון", href: "tel:0523684844" },
    { icon: WhatsappIcon, label: "צ׳אט", href: "https://wa.me/972523684844" },
    { icon: EnvelopeIcon, label: "דוא\"ל", href: "mailto:guycoh@outlook.co.il" },
    { icon: GlobeIcon, label: "אתר", href: "https://morg-orcin.vercel.app/muhni" },
  ];
  const calculators = [
    { icon: Calculator5, label: "מחשבון מהיר", href: "/muhni/calculators/simple_calculator" },
    { icon: Calculator2, label: "מחשבון יכולת", href: "/muhni/calculators/mortgage_capability" },
    { icon: Calculator3, label: "מס רכישה", href: "/muhni/calculators/purchase_tax_calculator" },
    { icon: SigmaIcon, label: "מחשבון משכנתא", href: "/muhni/calculators/refinance-calculator" },
  ];

  return (
    <div
      className="w-full min-h-screen text-white
                 flex justify-center
                 md:grid md:grid-cols-2 md:place-items-center"
    >
      {/* — הכרטיס — */}
      <div className="flex flex-col w-full order-2 md:order-1 animate-fade-in bg-gradient-to-br from-purple-700 via-purple-600 to-purple-800 ">

        {/* Header */}
        <div className="relative h-44 bg-white w-full "> {/* ⭐ mb-24 -> mb-0 */}
         <div className="absolute top-4 left-1/2 -translate-x-1/2 w-56">
            <Image src="/assets/images/svg/muhni_logo.svg" alt="Logo" width={224} height={90} />
          </div>
          
        </div>

        {/* גוף הכרטיס */}
        <div
          className="relative 
                     flex flex-col items-center
                     -mt-12 pt-36 px-6 mb-12"  /* ⭐ NEW: -mt-12 + pt-20 */
        >
          <div className="absolute -top-16 flex justify-center items-end">
            <div className="w-36 h-36 z-10 rounded-full overflow-hidden border-4 border-white shadow-xl translate-y-1/2 bg-white">
                    <Image src="/assets/images/imgFiles/my_image.jpg" alt="גיא כהן" width={144} height={144}  className="object-contain" />
            </div>
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight">גיא כהן</h1> {/* ⭐ mt-20 -> mt-0 */}
          <p className="mt-1 text-2xl">יועץ משכנתאות</p>

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
                      <btn.icon color="#6929AC" className="w-7 h-7 sm:w-9 sm:h-9" />
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
                              w-[72px] h-[72px] sm:w-20 sm:h-20 flex items-center justify-center"
                  >
                    <div className="bg-gray-50 border border-gray-200 rounded-md
                                    w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center">
                      <item.icon color="#6929AC" className="w-7 h-7 sm:w-9 sm:h-9" />
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

        {/* Footer */}
        <div className="w-full relative mt-24">
        
         {/* כפתור פגישה עגול שמרחף על הפוטר */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 z-10">
            <Link href="/muhni/schedule">
              <Image
                src="/assets/gal/meeting.svg"
                alt="קבע פגישה"
                width={142}
                height={142}
                className="object-contain"
              />
            </Link>
          </div>

          {/* הפוטר עצמו */}
          <div className="bg-white text-main text-sm py-12 rounded-b-xl shadow-sm text-right">
            <div className="flex items-center justify-center gap-2">
              <p className="font-medium text-xl">הרב נחום לוין 10, עפולה</p>
              <Image
                src="/assets/gal/waze.svg"
                alt="נווט עם Waze"
                width={56}
                height={56}
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



















