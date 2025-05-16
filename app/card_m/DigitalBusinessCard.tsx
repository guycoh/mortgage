"use client"
import Image from "next/image";
import Link from "next/link";

import EmailIcon from "public/assets/images/svg/EmailIcon";
import Calculator1 from "public/assets/images/svg/Calculator1";
import Calculator2 from "public/assets/images/svg/Calculator2";
import Calculator3 from "public/assets/images/svg/Calculator3";
import Calculator4 from "public/assets/images/svg/Calculator4";
import Phone from "@/public/assets/images/svg/phone";
import WebIcon from "@/public/assets/images/svg/webIcon";
import WhatsappIcon from "@/public/assets/images/svg/whatsapp";

import LocationIcon from "@/public/assets/images/svg/location";
import WazeIcon from "@/public/assets/images/svg/waze_icon";



export default function DigitalBusinessCard() {
  
  const buttons = [
    { icon: <Phone size={40} />, label: 'התקשר', href: 'tel:0502453345' },
    { icon: <WhatsappIcon size={40} />, label: 'ווצאפ', href: 'https://wa.me/972502453345' },
    { icon: <EmailIcon size={40} />, label: 'שלח מייל', href: 'mailto:mmusayov@gmail.com' },   
    { icon: <WebIcon size={40} />, label: 'אתר', href: 'https://morg-orcin.vercel.app/muhni7' },
  ];
  
    
  return (
  <div className="w-full min-h-screen justify-center bg-gradient-to-br text-white grid md:grid-cols-2">

    {/* —— צד ימין (כרטיס) —— */}
    <div className="flex flex-col justify-start items-stretch order-2 md:order-1 animate-fade-in">
      
      {/* Header לבן עם לוגו ותמונה */}
      <div className="relative h-52 bg-white w-full">
        <div className="absolute top-4 left-4 w-56 h-auto">
          <Image
            src="/assets/images/svg/muhni_logo.svg"
            alt="Logo"
            width={224}
            height={90}
            className="object-contain"
          />
        </div>
        <div className="absolute inset-0 flex justify-center items-end">
          <div className="w-36 h-36 z-10 rounded-full overflow-hidden border-4 border-white shadow-xl transform translate-y-1/2 bg-white">
            <Image
              src="/assets/images/imgFiles/moshe.jpg"
              alt="גיא כהן"
              width={144}
              height={144}
              className="object-cover"
            />
          </div>
        </div>
      </div>
  
      {/* גוף הכרטיס — גרדיאנט סגול עם הצללה פנימית */}
      <div className="relative bg-gradient-to-br from-purple-700 via-purple-600 to-purple-800 shadow-inner shadow-black/30 text-white flex flex-col items-center p-6">
  
        <Link href="/muhni7/schedule" className="absolute text-xs top-4 right-4 w-24 h-24 bg-white text-purple-600 rounded-full flex flex-col items-center justify-center gap-1 shadow-md hover:shadow-lg transition">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 4h10M5 11h14M5 19h14M5 15h14" />
          </svg>
          קבע פגישה
        </Link>
  
        {/* שם ותפקיד */}
        <h1 className="mt-20 text-3xl font-bold tracking-tight">משה מוסיוב</h1>
        <p className="mt-2">יועץ משכנתאות </p>         
        <span className="mt-2 flex items-center gap-2 text-sm">
          <Phone size={14} color="white" /> 050-2453345
          <EmailIcon size={14} color="white" /> mmusayov@gmail.com
        </span>
  
        <span className="mt-2 flex items-center gap-2 text-sm">
          <LocationIcon size={14} color="white" /> הרב נחום לוין, 7 עפולה 
         
        </span>
  
      
        <div className="w-full flex justify-center mt-10">
          <div className="w-full max-w-5xl">
         
             {/* — יצירת קשר — */}
            <h2 className="text-xl font-semibold mb-4 text-center">יצירת קשר</h2>
            <div className="grid grid-cols-4 gap-8">
              {buttons.map((btn, idx) => (
                <a
                  key={idx}
                  href={btn.href}
                  target={
                    btn.href.startsWith('http') ||
                    btn.href.startsWith('mailto') ||
                    btn.href.startsWith('tel')
                      ? '_blank'
                      : '_self'
                  }
                  rel="noopener noreferrer"
                  className="group w-full h-20 bg-white border-2 border-gray-300 rounded-xl shadow-md hover:shadow-xl hover:border-orange-500 transition-all duration-300 ease-in-out flex flex-col items-center justify-center relative overflow-hidden text-center"
                >
                  <div className="transition-transform duration-500 group-hover:rotate-[15deg] group-hover:scale-110 z-10 text-[#7e22ce] group-hover:text-orange-500">
                    {btn.icon}
                  </div>
                  <span className="mt-1 text-xs font-medium text-main group-hover:text-orange-500 z-10 transition-colors duration-300">
                    {btn.label}
                  </span>
                  <span className="absolute inset-0 bg-orange-100 opacity-0 group-hover:opacity-60 transition-opacity duration-500 z-0" />
                </a>
              ))}
            </div>
  
            {/* — מחשבוני משכנתא — */}
            <h2 className="text-xl font-semibold mb-4 mt-12 text-center">מחשבוני משכנתא</h2>
            <div className="grid grid-cols-4 gap-8">
              {[{ href: "/muhni7/calculators/simple_calculator", icon: <Calculator1 color="#7e22ce" size={40} />, label: "מחשבון הלוואה" },
                { href: "/muhni7/calculators/mortgage_capability", icon: <Calculator2 color="#7e22ce" size={40} />, label: "כמה משכנתא אוכל לקחת?" },
                { href: "/muhni7/calculators/purchase_tax_calculator", icon: <Calculator3 color="#7e22ce" size={40} />, label: "מס רכישה" },
                { href: "/muhni7/calculators/refinance-calculator", icon: <Calculator4 color="#7e22ce" size={40} />, label: "החזר חודשי" },
              ].map((btn, idx) => (
                <Link
                  key={idx}
                  href={btn.href}
                  className="group w-full h-32 bg-white border-2 border-gray-300 rounded-xl shadow-md hover:shadow-xl hover:border-orange-500 transition-all duration-300 ease-in-out flex items-center justify-center relative overflow-hidden text-center px-2 py-4"
                >
                  <div className="flex flex-col items-center justify-between h-full z-10">
                    <div className="min-h-[40px] flex items-center justify-center">
                      {btn.icon}
                    </div>
                    <span className="text-xs font-medium text-main group-hover:text-orange-500 transition-colors duration-300 text-center leading-tight">
                      {btn.label}
                    </span>
                  </div>
                  <span className="absolute inset-0 bg-orange-100 opacity-0 group-hover:opacity-60 transition-opacity duration-500 z-0" />
                </Link>
              ))}
            </div>
          {/* — כתובתנו  — */}
          <h2 className="  border-t border-white/30           text-xl font-semibold mb-4 mt-12 text-center">כתובתנו </h2>
            <div className="grid grid-cols-4 gap-8">    
             

                  <a
                    className="group w-full h-32 bg-white border-2 border-gray-300 rounded-xl shadow-md hover:shadow-xl hover:border-orange-500 transition-all duration-300 ease-in-out flex items-center justify-center relative overflow-hidden text-center px-2 py-4"
                    href="waze://?q=הרב+נחום+לוין+7+עפולה&navigate=yes"
                  >
                    <div className="flex flex-col items-center justify-between h-full z-10">
                      <div className="min-h-[40px] flex items-center justify-center">
                        <WazeIcon size={40} color="#7e22ce" className="hover:text-orange-500" />
                      </div>
                      <span className="text-xs font-medium text-main group-hover:text-orange-500 transition-colors duration-300 text-center leading-tight">
                        הרב נחום לוין 7, עפולה
                      </span>
                    </div>
                    <span className="absolute inset-0 bg-orange-100 opacity-0 group-hover:opacity-60 transition-opacity duration-500 z-0" />
                  </a>

           
            </div>

                    
          </div>
        </div>
  
  
      </div>

          {/* Footer — תופס את כל הרוחב של כרטיס הביקור בלבד עם שוליים מלמעלה */}
          <div className="w-full  mb-0  bg-gray-700">
                <div className=" bg-gray-700 text-center text-white text-sm py-4 rounded-b-xl">
                  כל הזכויות שמורות למורגי מערכות תוכנה© {new Date().getFullYear()}
                </div>
          </div>


    </div>
  </div>
  
  );
}

