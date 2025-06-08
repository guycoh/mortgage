
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

import WazeIcon from "@/public/assets/images/svg/waze_icon";



export default function DigitalBusinessCard() {
  const buttons = [
    { icon: PhoneIcon, label: "טלפון", href: 'tel:0523684844' },
    { icon: WhatsappIcon, label: "צ׳אט", href: 'https://wa.me/972523684844' },
    { icon: EnvelopeIcon, label: "דוא\"ל", href: 'mailto:guycoh@outlook.co.il' },
    { icon: GlobeIcon, label: "אתר", href: "https://morg-orcin.vercel.app/muhni" },
  ];
  const calculators = [
    { icon: Calculator5, label: "מחשבון מהיר", href: "/muhni/calculators/simple_calculator" },
    { icon: Calculator2, label: "מחשבון יכולת", href: "/muhni/calculators/mortgage_capability" },
    { icon: Calculator3, label: "מס רכישה", href: "/muhni/calculators/purchase_tax_calculator" },
    { icon: SigmaIcon, label: "מחשבון משכנתא", href: "/muhni/calculators/mortgage_calculator" },
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
                    <Image src="/assets/images/imgFiles/my_image.jpg" alt="משה " width={144} height={144}  className="object-contain" />
            </div>
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight">גיא כהן</h1> {/* ⭐ mt-20 -> mt-0 */}
          <p className="mt-1 text-2xl">יועץ משכנתאות </p>

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
                    <p className="font-medium text-xl">הרצל 92 ,רמלה</p>

                    <a
                      href="waze://?ll=31.951944,34.897222&navigate=yes"
                      className="relative group w-[52px] h-[52px] flex items-center justify-center rounded-full border border-main"
                    >
                      <WazeIcon size={34} color="#7e22ce" className="hover:text-orange-500 z-10" />
                      
                      <span className="absolute inset-0 bg-orange-100 opacity-0 group-hover:opacity-60 transition-opacity duration-500 rounded-full" />
                    </a>
              </div>
          <div className="flex items-center justify-center gap-2">
               

                <a
                  href="waze://?ll=31.951944,34.897222&navigate=yes"
                  className="relative group w-[52px] h-[52px] flex items-center justify-center rounded-full border border-main"
                >
                  <WazeIcon size={34} color="#7e22ce" className="hover:text-orange-500 z-10" />
                  
                  <span className="absolute inset-0 bg-orange-100 opacity-0 group-hover:opacity-60 transition-opacity duration-500 rounded-full" />
                </a>

                <p className="font-medium text-xl"> שד דוד המלך 2 ,לוד</p>
           </div>


          </div>
        </div>
      </div>
    </div>
  );
}



















// "use client"
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
// import CalendarIcon from "@/public/assets/images/svg/contact/CalendarIcon";
// import LocationIcon from "@/public/assets/images/svg/location";
// import WazeIcon from "@/public/assets/images/svg/waze_icon";


// export default function DigitalBusinessCard() {
  
//   const buttons = [
//     { icon: <Phone size={40} />, label: 'התקשר', href: 'tel:0523684844' },
//     { icon: <WhatsappIcon size={40} />, label: 'ווצאפ', href: 'https://wa.me/972523684844' },
//     { icon: <EmailIcon size={40} />, label: 'שלח מייל', href: 'mailto:guycoh@outlook.co.il' },   
//     { icon: <WebIcon size={40} />, label: 'אתר', href: 'https://morg-orcin.vercel.app/muhni' },
//   ];
  
//   const locations = [
//     {
//       name: "הרצל 92 רמלה",
//       coords: "31.936389,34.866111",
//     },
//     {
//       name: "שד דוד המלך 2 לוד",
//       coords: "31.951944,34.897222",
//     },
//     {
//       name: "הלוחמים 1 תל אביב",
//       coords: "32.046111,34.770833",
//     },
//   ];
  

//   return (
//     <div className="w-full min-h-screen justify-center bg-gradient-to-br text-white grid md:grid-cols-2">

//     {/* —— צד ימין (כרטיס) —— */}
//     <div className="flex flex-col justify-start items-stretch order-2 md:order-1 animate-fade-in">
      
//       {/* Header לבן עם לוגו ותמונה */}
//       <div className="relative h-52 bg-white w-full">
//         <div className="absolute top-4 left-4 w-56 h-auto">
//           <Image
//             src="/assets/images/svg/muhni_logo.svg"
//             alt="Logo"
//             width={224}
//             height={90}
//             className="object-contain"
//           />
//         </div>
//         <div className="absolute inset-0 flex justify-center items-end">
//           <div className="w-36 h-36 z-10 rounded-full overflow-hidden border-4 border-white shadow-xl transform translate-y-1/2 bg-white">
//             <Image
//               src="/assets/images/imgFiles/my_image.jpg"
//               alt="גיא כהן"
//               width={144}
//               height={144}
//               className="object-cover"
//             />
//           </div>
//         </div>
//       </div>
  
//       {/* גוף הכרטיס — גרדיאנט סגול עם הצללה פנימית */}
//       <div className="relative bg-gradient-to-br from-purple-700 via-purple-600 to-purple-800 shadow-inner shadow-black/30 text-white flex flex-col items-center p-6">
  
//         <Link href="/muhni/schedule" className="absolute text-xs top-4 right-4 w-24 h-24 bg-white text-purple-600 rounded-full flex flex-col items-center justify-center gap-1 shadow-md hover:shadow-lg transition">
//           <CalendarIcon/>
//           קבע פגישה
//         </Link>
  
//         {/* שם ותפקיד */}
//         <h1 className="mt-20 text-3xl font-bold tracking-tight">גיא כהן</h1>
//         <p className="mt-2">יועץ משכנתאות בכיר</p>         
//         <span className="mt-2 flex items-center gap-2 text-sm">
//           <Phone size={14} color="white" /> 052-3684844
//           <EmailIcon size={14} color="white" /> guycoh@outlook.co.il
//         </span>
  
//         <span className="mt-2 flex items-center gap-2 text-sm">
//           <LocationIcon size={14} color="white" /> שד' דוד המלך 2 , לוד
//           <LocationIcon size={14} color="white" /> הרצל 92, רמלה
//         </span>
  
//         {/* — יצירת קשר — */}
//         <div className="w-full flex justify-center mt-10">
//           <div className="w-full max-w-5xl">
//             <h2 className="text-xl font-semibold mb-4 text-center">יצירת קשר</h2>
//             <div className="grid grid-cols-4 gap-8">
//               {buttons.map((btn, idx) => (
//                 <a
//                   key={idx}
//                   href={btn.href}
//                   target={
//                     btn.href.startsWith('http') ||
//                     btn.href.startsWith('mailto') ||
//                     btn.href.startsWith('tel')
//                       ? '_blank'
//                       : '_self'
//                   }
//                   rel="noopener noreferrer"
//                   className="group w-full h-20 bg-white border-2 border-gray-300 rounded-xl shadow-md hover:shadow-xl hover:border-orange-500 transition-all duration-300 ease-in-out flex flex-col items-center justify-center relative overflow-hidden text-center"
//                 >
//                   <div className="transition-transform duration-500 group-hover:rotate-[15deg] group-hover:scale-110 z-10 text-[#7e22ce] group-hover:text-orange-500">
//                     {btn.icon}
//                   </div>
//                   <span className="mt-1 text-xs font-medium text-main group-hover:text-orange-500 z-10 transition-colors duration-300">
//                     {btn.label}
//                   </span>
//                   <span className="absolute inset-0 bg-orange-100 opacity-0 group-hover:opacity-60 transition-opacity duration-500 z-0" />
//                 </a>
//               ))}
//             </div>
  
//             {/* — מחשבוני משכנתא — */}
//             <h2 className="text-xl font-semibold mb-4 mt-12 text-center">מחשבוני משכנתא</h2>
//             <div className="grid grid-cols-4 gap-8">
//               {[{ href: "/muhni/calculators/simple_calculator", icon: <Calculator1 color="#7e22ce" size={40} />, label: "מחשבון הלוואה" },
//                 { href: "/muhni/calculators/mortgage_capability", icon: <Calculator2 color="#7e22ce" size={40} />, label: "כמה משכנתא אוכל לקחת?" },
//                 { href: "/muhni/calculators/purchase_tax_calculator", icon: <Calculator3 color="#7e22ce" size={40} />, label: "מס רכישה" },
//                 { href: "/muhni/calculators/mortgage_calculator", icon: <Calculator4 color="#7e22ce" size={40} />, label: "מחשבון משכנתא" },
//               ].map((btn, idx) => (
//                 <Link
//                   key={idx}
//                   href={btn.href}
//                   className="group w-full h-32 bg-white border-2 border-gray-300 rounded-xl shadow-md hover:shadow-xl hover:border-orange-500 transition-all duration-300 ease-in-out flex items-center justify-center relative overflow-hidden text-center px-2 py-4"
//                 >
//                   <div className="flex flex-col items-center justify-between h-full z-10">
//                     <div className="min-h-[40px] flex items-center justify-center">
//                       {btn.icon}
//                     </div>
//                     <span className="text-xs font-medium text-main group-hover:text-orange-500 transition-colors duration-300 text-center leading-tight">
//                       {btn.label}
//                     </span>
//                   </div>
//                   <span className="absolute inset-0 bg-orange-100 opacity-0 group-hover:opacity-60 transition-opacity duration-500 z-0" />
//                 </Link>
//               ))}
//             </div>
        
//          {/* — כתובתנו  — */}
//          <h2 className="  border-t border-white/30           text-xl font-semibold mb-4 mt-12 text-center">כתובתנו </h2>
//                     <div className="grid grid-cols-4 gap-8">
//               <a
//                 className="group w-full h-32 bg-white border-2 border-gray-300 rounded-xl shadow-md hover:shadow-xl hover:border-orange-500 transition-all duration-300 ease-in-out flex items-center justify-center relative overflow-hidden text-center px-2 py-4"
//                 href="waze://?ll=31.936389,34.866111&navigate=yes"
//               >
//                 <div className="flex flex-col items-center justify-between h-full z-10">
//                   <div className="min-h-[40px] flex items-center justify-center">
//                     <WazeIcon size={40} color="#7e22ce" className="hover:text-orange-500" />
//                   </div>
//                   <span className="text-xs font-medium text-main group-hover:text-orange-500 transition-colors duration-300 text-center leading-tight">
//                     הרצל 92 רמלה
//                   </span>
//                 </div>
//                 <span className="absolute inset-0 bg-orange-100 opacity-0 group-hover:opacity-60 transition-opacity duration-500 z-0" />
//               </a>

//               <a
//                 className="group w-full h-32 bg-white border-2 border-gray-300 rounded-xl shadow-md hover:shadow-xl hover:border-orange-500 transition-all duration-300 ease-in-out flex items-center justify-center relative overflow-hidden text-center px-2 py-4"
//                 href="waze://?ll=31.951944,34.897222&navigate=yes"
//               >
//                 <div className="flex flex-col items-center justify-between h-full z-10">
//                   <div className="min-h-[40px] flex items-center justify-center">
//                     <WazeIcon size={40} color="#7e22ce" className="hover:text-orange-500" />
//                   </div>
//                   <span className="text-xs font-medium text-main group-hover:text-orange-500 transition-colors duration-300 text-center leading-tight">
//                     שד דוד המלך 2 לוד
//                   </span>
//                 </div>
//                 <span className="absolute inset-0 bg-orange-100 opacity-0 group-hover:opacity-60 transition-opacity duration-500 z-0" />
//               </a>

//               <a
//                 className="group w-full h-32 bg-white border-2 border-gray-300 rounded-xl shadow-md hover:shadow-xl hover:border-orange-500 transition-all duration-300 ease-in-out flex items-center justify-center relative overflow-hidden text-center px-2 py-4"
//                 href="waze://?ll=32.046111,34.770833&navigate=yes"
//               >
//                 <div className="flex flex-col items-center justify-between h-full z-10">
//                   <div className="min-h-[40px] flex items-center justify-center">
//                     <WazeIcon size={40} color="#7e22ce" className="hover:text-orange-500" />
//                   </div>
//                   <span className="text-xs font-medium text-main group-hover:text-orange-500 transition-colors duration-300 text-center leading-tight">
//                     הלוחמים 1 תל אביב
//                   </span>
//                 </div>
//                 <span className="absolute inset-0 bg-orange-100 opacity-0 group-hover:opacity-60 transition-opacity duration-500 z-0" />
//               </a>
//             </div>

        
//           </div>
//         </div>
  
      
  
//       </div>

//           {/* Footer — תופס את כל הרוחב של כרטיס הביקור בלבד עם שוליים מלמעלה */}
//           <div className="w-full  mb-0  bg-gray-700">
//                 <div className=" bg-gray-700 text-center text-white text-sm py-4 rounded-b-xl">
//                   כל הזכויות שמורות למורגי מערכות תוכנה© {new Date().getFullYear()}
//                 </div>
//           </div>







//     </div>
//   </div>
//   );
// }


























































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
//     { icon: <Phone size={40} />, label: 'התקשר', href: 'tel:0523684844' },
//     { icon: <WhatsappIcon size={40} />, label: 'ווצאפ', href: 'https://wa.me/972523684844' },
//     { icon: <EmailIcon size={40} />, label: 'שלח מייל', href: 'mailto:guycoh@outlook.co.il' },   
//     { icon: <WebIcon size={40} />, label: 'אתר', href: 'https://morg-orcin.vercel.app/muhni' },
//   ];
  
    
//   return (
//     <div className="w-full min-h-screen justify-center  bg-gradient-to-br text-white grid md:grid-cols-2">
  


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
//                 src="/assets/images/imgFiles/my_image.jpg"
//                 alt="גיא כהן"
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
//           <h1 className="mt-20 text-3xl font-bold tracking-tight">גיא כהן</h1>
//           <p className="text-white mt-2">יועץ משכנתאות בכיר </p>         
//             <span className="text-white mt-2 flex items-center space-x-2">
//               <span>052-3684844</span>
//               <Phone size={14} color="white" />            
//               <span>guycoh@outlook.co.il</span>
//               <EmailIcon size={14} color="white" />
//             </span>

//             <span className="text-white mt-2 flex items-center space-x-2">
//               <LocationIcon size={14} color="white" />    
//               <span>שד' דוד המלך 2 , לוד</span>
//               <LocationIcon size={14} color="white" />        
//               <span>הרצל 92, רמלה</span>
          
//             </span>



//           {/* Grid של כפתורי יצירת קשר */}
//         {/* Grid של כפתורים: יצירת קשר + מחשבונים */}  
// <div className="mt-6 w-full flex flex-col gap-4">

//         {/* — יצירת קשר — */}
//         <div>
//         <h2 className="text-xl font-semibold mb-4">יצירת קשר</h2>
//         <div className="grid grid-cols-4 gap-4">
//             <a href="tel:0523684844" className="flex flex-col items-center hover:opacity-80 transition">
//             {/* טלפון */}
//             <Phone size={40} color="white" />
//             <span className="text-sm">התקשר</span>
//             </a>
           
//             <a href="https://wa.me/972523684844" target="_blank" className="flex flex-col items-center hover:opacity-80 transition">
//             {/* וואטסאפ */}
//             <WhatsappIcon size={40} color="white" />
//             <span className="text-sm">וואטסאפ</span>
//             </a>

//             <a href="mailto:guycoh@outlook.co.il" className="flex flex-col items-center hover:opacity-80 transition">
//             {/* מייל */}
//             <EmailIcon size={40} color="white" />
//             <span className="text-sm">מייל</span>
//             </a>
//             <a href="https://morg-orcin.vercel.app/muhni" className="flex flex-col items-center hover:opacity-80 transition">
//             {/* מייל */}
//             <WebIcon size={40} color="white" /> {/* סגול */}
//             <span className="text-sm">אתר</span>
//             </a>



//         </div>
//         </div>

//         {/* — מחשבוני משכנתא — */}
//         <div>
//         <h2 className="text-xl font-semibold mb-4">מחשבוני משכנתא</h2>
//         <div className="grid grid-cols-4 gap-4">
//             <Link href="/muhni/calculators/simple_calculator" className="flex flex-col items-center hover:opacity-80 transition">
//               <Calculator1 size={40} color="white" />
//             <span className="text-sm text-center">מחשבון הלוואה</span>
//             </Link>

//             <Link href="/muhni/calculators/mortgage_capability" className="flex flex-col items-center hover:opacity-80 transition">
//               <Calculator2 size={40} color="white" />
//             <span className="text-sm text-center">כמה משכנתא אוכל לקחת?</span>
//             </Link>

//             <Link href="/muhni/calculators/purchase_tax_calculator" className="flex flex-col items-center hover:opacity-80 transition">
//               <Calculator3 size={40} color="white" />
//             <span className="text-sm text-center">מס רכישה</span>
//             </Link>
          
//             <Link href="/muhni/calculators/refinance-calculator" className="flex flex-col items-center hover:opacity-80 transition">
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
//             <div className="bg-white flex flex-col items-center justify-center border rounded-2xl p-6 shadow hover:shadow-lg transition">
//               <a
//                 href="https://waze.com/ul?q=הרצל+92+רמלה&navigate=yes"
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="flex flex-col items-center space-y-4"
//               >
//                 <WazeIcon size={60} />
//                 <span className="text-center text-sm font-semibold">הרצל 92, רמלה</span>
//               </a>
//             </div>
//             <div className=" bg-white flex flex-col items-center justify-center border rounded-2xl p-6 shadow hover:shadow-lg transition">
//               <a
//                 href="https://waze.com/ul?q=שדרות+דוד+המלך+2+לוד&navigate=yes"
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="flex flex-col items-center space-y-4"
//               >
//                 <WazeIcon size={60} />
//                 <span className="text-center text-sm font-semibold">שדרות דוד המלך 2, לוד</span>
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
