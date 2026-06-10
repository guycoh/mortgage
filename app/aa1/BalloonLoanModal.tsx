"use client";

import { useState } from "react";

import BalloonLoanCalculator from "../home/calculators/baloon/BalloonLoanCalculator";


type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function BalloonLoanModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="
        fixed inset-0 z-50
        flex items-center justify-center
        bg-black/50 backdrop-blur-sm
        p-4
      "
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="
          relative w-full max-w-5xl
          max-h-[90vh]
          overflow-y-auto
          bg-white
          rounded-3xl
          shadow-2xl
          p-6
        "
      >
        <button
          onClick={onClose}
          className="
            absolute top-4 left-4
            w-10 h-10
            rounded-full
            bg-gray-100
            hover:bg-gray-200
            text-xl
          "
        >
          ×
        </button>

        <h2 className="text-2xl font-bold text-center mb-6">
          מחשבון הלוואת בלון
        </h2>

        <BalloonLoanCalculator />
      </div>
    </div>
  );
}














// export default function BalloonLoanModal() {

//   const [isOpen, setIsOpen] = useState(false);


//   return (
//     <>
//       {/* כפתור פתיחה */}
//       <button
//         onClick={() => setIsOpen(true)}
//         className="
//         w-full
//         rounded-2xl
//         bg-linear-to-r
//         from-orange-500
//         to-orange-600
//         px-6
//         py-4
//         text-white
//         font-bold
//         shadow-xl
//         hover:scale-[1.02]
//         transition
//         "
//       >
//         מחשבון הלוואת בלון
//       </button>


//       {isOpen && (

//         <div
//           className="
//           fixed
//           inset-0
//           z-50
//           flex
//           items-center
//           justify-center
//           bg-black/50
//           backdrop-blur-sm
//           p-4
//           "
//           onClick={() => setIsOpen(false)}
//         >


//           <div
//             onClick={(e)=>e.stopPropagation()}
//             className="
//             relative
//             w-full
//             max-w-5xl
//             max-h-[90vh]
//             overflow-y-auto
//             rounded-3xl
//             bg-white
//             shadow-2xl
//             p-5
//             "
//           >


//             {/* סגירה */}
//             <button
//               onClick={()=>setIsOpen(false)}
//               className="
//               absolute
//               left-4
//               top-4
//               z-10
//               h-10
//               w-10
//               rounded-full
//               bg-gray-100
//               text-xl
//               hover:bg-gray-200
//               "
//             >
//               ×
//             </button>


//             <div className="pt-4">

//               <h2
//                 className="
//                 text-center
//                 text-2xl
//                 font-bold
//                 text-gray-800
//                 mb-6
//                 "
//               >
//                 מחשבון הלוואת בלון
//               </h2>


//               <BalloonLoanCalculator />


//             </div>

//           </div>


//         </div>

//       )}

//     </>
//   );
// }