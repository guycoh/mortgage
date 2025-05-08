import Link from "next/link";
import Image from "next/image";

import IconGeneralMortgage from "@/public/assets/images/svg/motrgageType/generalMortgage";
import HomeIcon from "@/public/assets/images/svg/motrgageType/homeIcon";
import LoanIcon from "@/public/assets/images/svg/motrgageType/loanIcon";
import ReverseIcon from "@/public/assets/images/svg/motrgageType/ReverseIcon";
import ConsolidationIcon from "@/public/assets/images/svg/motrgageType/ConsolidationIcon";
import EligibleIcon from "@/public/assets/images/svg/motrgageType/EligibleIcon";
import RefinancingIcon from  "@/public/assets/images/svg/motrgageType/RefinancingIcon";
import InsuranceIcon from  "@/public/assets/images/svg/motrgageType/InsuranceIcon";
import RefusedIcon from  "@/public/assets/images/svg/motrgageType/RefusedIcon";
//import { HomeIcon, LoanIcon, ReverseIcon, InsuranceIcon, NonBankIcon, ConsolidationIcon, EligibleIcon, 
// , RefusedIcon } from "@/components/icons";

const mortgageCategories = [
  { category: "משכנתא לדיור", link: "mortgage_for_housing", icon: <HomeIcon size={100} color="#475569"/> },
  { category: "הלוואה לכל מטרה", link: "mortgage_for_any_purpose", icon: <LoanIcon size={100} color="#475569"  /> },
  { category: "משכנתא הפוכה", link: "reverse_mortgage", icon: <ReverseIcon size={100} color="#475569" /> },  
  { category: "איחוד הלוואות", link: "loan_consolidation", icon: <ConsolidationIcon size={100} /> },
  { category: "משכנתא חוץ בנקאית", link: "non_bank_mortgage_info", icon: <IconGeneralMortgage size={100}/> },
  { category: "מחיר למשתכן", link: "home_for_eligible_buyers", icon: <EligibleIcon size={100}/> },
  { category: "מיחזור משכנתא", link: "mortgage_refinancing", icon: <RefinancingIcon size={100} /> },
  { category: "ביטוח משכנתא", link: "mortgage_insurance", icon: <InsuranceIcon size={100} color="#475569"/> },
  { category: "מסורבי בנקים", link: "mortgage_for_refused_clients", icon: <RefusedIcon size={100} /> },
 
];




export default function MortgageCategories() {
  return (
    <main className="bg-gradient-to-br from-purple-50 via-violet-100 to-purple-200 text-gray-700 ">
    <div className="p-6 animate-fade-in">
      <h1 className="text-2xl font-bold mb-4 text-center text-fontss1">
        איזה משכנתא מתאימה לי? &nbsp;
        <Link
          href={`/muhni/guide`}
          className="text-blue-400 underline hover:text-blue-600 transition-colors"
        >
          למדריך המשכנתא
        </Link>
      </h1>
     
   

     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {mortgageCategories.map((category, index) => (
                  <div
                    key={index}
                    className="text-fonts  p-4 shadow-md border rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-[1.02] flex flex-col justify-between items-center min-h-[260px] bg-white"
                  >
                    <h2 className=" text-fonts text-lg font-semibold text-center mb-2">
                      {category.category}
                    </h2>

                    <div className="flex items-center justify-center   mb-4">
                      {category.icon}
                    </div>

                    <Link href={`/muhni/${category.link}`} className="w-full">
                      <div className="mt-auto bg-main hover:bg-[#a39d8f] text-[#e5e4e3] font-bold py-2 px-4 rounded-full text-center transition-colors w-full">
                        למידע נוסף
                      </div>
                    </Link>
                  </div>
                ))}
    </div>

    </div>

    </main>

  );
}



// import Link from "next/link";
// import Image from "next/image";

// import IconGeneralMortgage from "@/public/assets/images/svg/motrgageType/generalMortgage";


// const mortgageCategories = [
//   { category: "משכנתא לדיור", link: "mortgage_for_housing" },
//   { category: "הלוואה לכל מטרה", link: "mortgage_for_any_purpose" },
//   { category: "משכנתא הפוכה", link: "reverse_mortgage" },
//   { category: "ביטוח משכנתא", link: "mortgage_insurance" },
//   { category: "משכנתא חוץ בנקאית", link: "non_bank_mortgage_info" },
//   { category: "איחוד הלוואות", link: "loan_consolidation" },
//   { category: "מחיר למשתכן", link: "home_for_eligible_buyers" },
//   { category: "מיחזור משכנתא", link: "mortgage_refinancing" },
//   { category: "מסורבי בנקים", link: "mortgage_for_refused_clients" },
// ];

// export default function MortgageCategories() {
//   return (
//     <div className="p-6 animate-fade-in">
//       <h1 className="text-2xl font-bold mb-4 text-center">
//         איזה משכנתא מתאימה לי? &nbsp;
//         <Link
//           href={`/muhni/guide`}
//           className="text-blue-400 underline hover:text-blue-600 transition-colors"
//         >
//           למדריך המשכנתא
//         </Link>
//       </h1>
     
//      <IconGeneralMortgage size={22}/>

//       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//         {mortgageCategories.map((category, index) => (
//           <div
//             key={index}
//             className="p-4 shadow-md border rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-[1.02] flex flex-col justify-between items-center min-h-[260px] bg-white"
//           >
//             <h2 className="text-lg font-semibold text-center mb-2">
//               {category.category}
//             </h2>

//             <div className="flex items-center justify-center h-20 w-20 rounded-full bg-blue-100 mb-4">
//               <Image
//                 src="/assets/images/svg/home.svg"
//                 alt="home"
//                 width={64}
//                 height={64}
//               />
//             </div>

//             <Link href={`/muhni/${category.link}`} className="w-full">
//               <div className="mt-auto bg-main hover:bg-[#a39d8f] text-[#e5e4e3] font-bold py-2 px-4 rounded-full text-center transition-colors w-full">
//                 למידע נוסף
//               </div>
//             </Link>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

