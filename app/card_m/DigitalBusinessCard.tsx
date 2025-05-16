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
import WazeIcon from "@/public/assets/images/svg/waze";
import LocationIcon from "@/public/assets/images/svg/location";

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
  
        {/* — יצירת קשר — */}
        <div className="w-full flex justify-center mt-10">
          <div className="w-full max-w-5xl">
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
          </div>
        </div>
  
        {/* Footer בתוך רקע סגול */}
        <div className="w-full mt-12 pt-6 border-t border-white/30 text-sm">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-white flex flex-col items-center justify-center border rounded-2xl p-6 shadow hover:shadow-lg transition">
            <a
                href="waze://?q=הרצל+92+רמלה&navigate=yes"
                className="flex flex-col items-center space-y-4"
              >
                <WazeIcon size={60} />
                <span className="text-center text-sm font-semibold">הרצל 92, רמלה</span>
              </a>
            </div>
           
          </div>
          <div className="text-center text-gray-200 text-xs">
            כל הזכויות שמורות למורגי מערכות תוכנה© {new Date().getFullYear()}
          </div>
        </div>
  
      </div>
    </div>
  </div>
  
  );
}

















// import Image from "next/image";
// import Link from "next/link";

// import EmailIcon from "public/assets/images/svg/EmailIcon";
// import Calculator1 from "public/assets/images/svg/Calculator1";
// import Calculator2 from "public/assets/images/svg/Calculator2";
// import Calculator3 from "public/assets/images/svg/Calculator3";
// import Calculator4 from "public/assets/images/svg/Calculator4";
// import Phone from "@/public/assets/images/svg/phone";
// import WebIcon from "@/public/assets/images/svg/webIcon";
// import WhatsappIcon from "@/public/assets/images/svg/whatsapp";
// import WazeIcon from "@/public/assets/images/svg/waze";
// import LocationIcon from "@/public/assets/images/svg/location";

// export default function DigitalBusinessCard() {
 
//   const buttons = [
//     { icon: <Phone size={40} />, label: 'התקשר', href: 'tel:0502453345' },
//     { icon: <WhatsappIcon size={40} />, label: 'ווצאפ', href: 'https://wa.me/972502453345' },
//     { icon: <EmailIcon size={40} />, label: 'שלח מייל', href: 'mailto:mmusayov@gmail.com' },   
//     { icon: <WebIcon size={40} />, label: 'אתר', href: 'https://morg-orcin.vercel.app/muhni7' },
//   ];
 
 
 
 
//   return (
//     <div className="w-full min-h-screen bg-gradient-to-br text-white grid md:grid-cols-2">
   


//       {/* —— צד ימין (כרטיס) —— */}
//       <div className="flex flex-col justify-start items-stretch order-2 md:order-1 animate-fade-in">
//         {/* Header לבן עם לוגו ותמונה */}
//         <div className="relative h-52 bg-white w-full">
        
        
        
//           <div className="absolute top-4 left-4 w-56 h-auto">
//             <Image
//               src="/assets/images/svg/muhni_logo.svg"
//               alt="Logo"
//               width={224}
//               height={90}
//               className="object-contain"
//             />
//           </div>
//           <div className="absolute inset-0 flex justify-center items-end">
//             <div className="w-36 h-36 z-10 rounded-full overflow-hidden border-4 border-white shadow-xl transform translate-y-1/2 bg-white">
//               <Image
//                 src="/assets/images/imgFiles/moshe.jpg"
//                 alt="moshe"
//                 width={144}
//                 height={144}
//                 className="object-cover"
//               />
//             </div>
//           </div>
//         </div>

//         {/* בטן הכרטיס — גרדיאנט סגול עם הצללה פנימית */}
//         <div className="relative bg-gradient-to-br from-purple-700 via-purple-600 to-purple-800 shadow-inner shadow-black/30 text-white flex flex-col items-center p-6">
//                 <Link href="/muhni/schedule" className="absolute text-xs top-4 right-4 w-24 h-24 bg-white text-purple-600 rounded-full flex flex-col items-center justify-center gap-1 shadow-md hover:shadow-lg transition">
//                 <svg
//                     xmlns="http://www.w3.org/2000/svg"
//                     className="h-5 w-5"
//                     fill="none"
//                     viewBox="0 0 24 24"
//                     stroke="currentColor"
//                     strokeWidth={2}
//                   >
//                     <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 4h10M5 11h14M5 19h14M5 15h14" />
//                   </svg>
//                   קבע פגישה
//                 </Link>
 

//           {/* שם ותפקיד */}
//           <h1 className="mt-20 text-3xl font-bold tracking-tight">משה מוסיוב</h1>
//           <p className="text-white mt-2">יועץ משכנתאות</p>         
//             <span className="text-white mt-2 flex items-center space-x-2">
//               <span>050-2453345</span>
//               <Phone size={14} color="white" />            
//               <span>mmusayov@gmail.com</span>
//               <EmailIcon size={14} color="white" />
//             </span>

//             <span className="text-white mt-2 flex items-center space-x-2">
//               <LocationIcon size={14} color="white" />    
//               <span>הרב נחום לוין, 7 עפולה </span>
                        
//             </span>



//           {/* Grid של כפתורי יצירת קשר */}
//         {/* Grid של כפתורים: יצירת קשר + מחשבונים */}  
// <div className="mt-6 w-full flex flex-col gap-4">

//         {/* — יצירת קשר — */}
//         <div className="w-full flex justify-center">
//         <div>
//         <h2 className="text-xl font-semibold mb-4">יצירת קשר</h2>
         
         
         
//           <div className="grid grid-cols-4 gap-8 max-w-md">
//             {buttons.map((btn, idx) => (
//               <a
//                 key={idx}
//                 href={btn.href}
//                 target={btn.href.startsWith('http') || btn.href.startsWith('mailto') || btn.href.startsWith('tel') ? '_blank' : '_self'}
//                 rel="noopener noreferrer"
//                 className="group w-20 h-20 bg-white border-2 border-gray-300 rounded-xl shadow-md hover:shadow-xl hover:border-orange-500 transition-all duration-300 ease-in-out flex flex-col items-center justify-center relative overflow-hidden text-center"
//               >
//                 <div className="transition-transform duration-500 group-hover:rotate-[15deg] group-hover:scale-110 z-10 text-[#7e22ce] group-hover:text-orange-500">
//                   {btn.icon}
//                 </div>
//                 <span className="mt-1 text-xs font-medium text-main group-hover:text-orange-500 z-10 transition-colors duration-300">
//                   {btn.label}
//                 </span>
//                 <span className="absolute inset-0 bg-orange-100 opacity-0 group-hover:opacity-60 transition-opacity duration-500 z-0" />
//               </a>
//             ))}
//           </div>
//           </div>
//         </div>

//         {/* — מחשבוני משכנתא — */}
//         <div>
//         <h2 className="text-xl font-semibold mb-4">מחשבוני משכנתא</h2>
//         <div className="grid grid-cols-4 gap-4">
//             <Link href="/muhni7/calculators/simple_calculator" className="flex flex-col items-center hover:opacity-80 transition">
//               <Calculator1 size={40} color="white" />
//             <span className="text-sm text-center">מחשבון הלוואה</span>
//             </Link>

//             <Link href="/muhni7/calculators/mortgage_capability" className="flex flex-col items-center hover:opacity-80 transition">
//               <Calculator2 size={40} color="white" />
//             <span className="text-sm text-center">כמה משכנתא אוכל לקחת?</span>
//             </Link>

//             <Link href="/muhni7/calculators/purchase_tax_calculator" className="flex flex-col items-center hover:opacity-80 transition">
//               <Calculator3 size={40} color="white" />
//             <span className="text-sm text-center">מס רכישה</span>
//             </Link>
          
//             <Link href="/muhni7/calculators/refinance-calculator" className="flex flex-col items-center hover:opacity-80 transition">
//             <Calculator4 size={40} color="white" />
//             <span className="text-sm text-center">החזר חודשי</span>
//             </Link>
//         </div>
//         </div>
//         </div>

//         </div>

//         {/* Footer */}
//         <div className="bg-gradient-to-br from-purple-700 via-purple-600 to-purple-800 text-xs text-center text-gray-400 p-6">
//           <div className="grid grid-cols-2 gap-6 mb-4">
//             <div className=" bg-white flex flex-col items-center justify-center border rounded-2xl p-6 shadow hover:shadow-lg transition">
//               <a
//                 href="https://waze.com/ul?q=הרצל+92+רמלה&navigate=yes"
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="flex flex-col items-center space-y-4"
//               >
//                 <WazeIcon size={60} />
//                 <span className="text-center text-sm font-semibold">הרב נחום לוין 7, עפולה</span>
//               </a>
//             </div>
           
//           </div>

//   <div className="text-gray-400 text-xs">
//     כל הזכויות שמורות © {new Date().getFullYear()}
//   </div>
// </div>


//       </div>
//     </div>
//   );
// }
