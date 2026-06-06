import Link from "next/link";
import Image from "next/image";

const banks = [
  {
    name: "בנק מזרחי",
    href: "/home/guide/mortgage_balance/mizrachi",
    image: "/assets/images/imgFiles/mizrachi.png",
  },
  {
    name: "בנק לאומי",
    href: "/home/guide/mortgage_balance/leumi",
    image: "/assets/images/imgFiles/leumi.png",
  },
  {
    name: "בנק פועלים",
    href: "/home/guide/mortgage_balance/hapoalim",
    image: "/assets/images/imgFiles/hapoalim.png",
  },
  {
    name: "בנק דיסקונט",
    href: "/home/guide/mortgage_balance/discount",
    image: "/assets/images/imgFiles/discount.png",
  },
  {
    name: "בנק בינלאומי",
    href: "/home/guide/mortgage_balance/benleumi",
    image: "/assets/images/imgFiles/benleumi.png",
  },
  {
    name: "בנק ירושלים",
    href: "/home/guide/mortgage_balance/jerusalem",
    image: "/assets/images/imgFiles/jerusalem.jpg",
  },
];


const MenuPage = () => {
  return (
    <main className="bg-galbg text-gray-700 leading-relaxed font-open-sans">

      <div className="min-h-screen flex flex-col justify-center items-center py-10">

        <div className="bg-white p-8 rounded-xl shadow-lg w-11/12 md:w-1/2 lg:w-1/3 border border-gray-200">

          <h1 className="text-4xl font-bold text-gray-800 text-center tracking-tight">
            מדריכים להוצאת יתרת סילוק
          </h1>


          <div className="grid grid-cols-2 gap-4 mt-8">

            {banks.map((bank) => (

              <Link
                key={bank.name}
                href={bank.href}
                className="
                  relative block h-24 overflow-hidden rounded-xl
                  shadow-lg
                  transform transition duration-300 ease-in-out
                  hover:scale-105
                  group
                  border border-gray-200
                "
              >

                {/* תמונת הבנק */}
                <Image
                  src={bank.image}
                  alt={bank.name}
                  fill
                  className="
                    object-contain
                    p-3
                    transition duration-300
                    group-hover:scale-110
                  "
                />


                {/* שכבה עדינה בלבד */}
                <div className="
                  absolute inset-0 
                  bg-white/40
                  group-hover:bg-white/20
                  transition
                " />


                
              </Link>

            ))}

          </div>

        </div>

      </div>

    </main>
  );
};

export default MenuPage;





















// import Link from "next/link";

// const MenuPage = () => {
//   return (
//     <main className="bg-galbg text-gray-700 leading-relaxed font-open-sans font-normal  ">
//     <div className=" from-white to-[#f8f8f8] min-h-screen flex flex-col justify-center items-center py-10">
//       <div className="bg-white p-8 rounded-xl shadow-lg w-11/12 md:w-1/2 lg:w-1/3 text-center space-y-6 border border-gray-200">
//         <h1 className="text-4xl font-bold text-gray-800 tracking-tight">
//           מדריכים להוצאת יתרת סילוק
//         </h1>
//         <div className="space-y-4 mt-6">
//           <Link
//             href="/home/guide/mortgage_balance/mizrachi"
//             className="block text-xl font-semibold text-white bg-linear-to-r from-orange-400 to-orange-600 hover:bg-gradient-to-l py-3 px-6 rounded-lg shadow-lg transform transition duration-300 ease-in-out hover:scale-105"
//           >
//             בנק מזרחי
//           </Link>
//           <Link
//             href="/home/guide/mortgage_balance//leumi"
//             className="block text-xl font-semibold text-white bg-linear-to-r from-sky-400 to-blue-600 hover:bg-gradient-to-l py-3 px-6 rounded-lg shadow-lg transform transition duration-300 ease-in-out hover:scale-105"
//           >
//             בנק לאומי
//           </Link>
//           <Link
//             href="/home/guide/mortgage_balance/hapoalim"
//             className="block text-xl font-semibold text-white bg-linear-to-r from-red-500 to-red-700 hover:bg-gradient-to-l py-3 px-6 rounded-lg shadow-lg transform transition duration-300 ease-in-out hover:scale-105"
//           >
//             בנק פועלים
//           </Link>
//           <Link
//             href="/home/guide/mortgage_balance/discount"
//             className="block text-xl font-semibold text-white bg-linear-to-r from-green-500 to-green-700 hover:bg-gradient-to-l py-3 px-6 rounded-lg shadow-lg transform transition duration-300 ease-in-out hover:scale-105"
//           >
//             בנק דיסקונט
//           </Link>
//           <Link
//             href="/home/guide/mortgage_balance/benleumi"
//             className="block text-xl font-semibold text-white bg-linear-to-r from-yellow-400 to-yellow-600 hover:bg-gradient-to-l py-3 px-6 rounded-lg shadow-lg transform transition duration-300 ease-in-out hover:scale-105"
//           >
//             בנק בינלאומי
//           </Link>
         
//            <Link
//             href="/home/guide/mortgage_balance/jerusalem"
//             className="block text-xl font-semibold text-white bg-linear-to-r from-yellow-400 to-yellow-600 hover:bg-gradient-to-l py-3 px-6 rounded-lg shadow-lg transform transition duration-300 ease-in-out hover:scale-105"
//           >
//             בנק ירושלים
//           </Link>







//         </div>
//       </div>
//     </div>
//     </main>

//   );
// };

// export default MenuPage;
