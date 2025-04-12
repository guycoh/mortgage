"use client"
import SignupForm from './form'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200">
      <SignupForm />
    </div>
  )
}



























// "use client"

// import { Nav } from "../home/components/nav";
// import GoogleIcon from "../svgFiles/google";
// import { useState } from 'react';
// import { createClient } from "@supabase/supabase-js";
// import Image from "next/image"


// export default function SignupForm() {

//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [message, setMessage] = useState('');
//   const [phone, setPhone] = useState('');
//   const [fullName, setFullName] = useState('');

//   const supabase=createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
//     );


//   const handleSignUp = async (e: React.FormEvent) => {
//     e.preventDefault();

//     // קריאה ל-Supabase לרישום משתמש חדש
//     const { error } = await supabase.auth.signUp({
//       email,
     
//       password,
//       phone,
  
//     });

//     if (error) {
//       setMessage(`Error: ${error.message}`);
//     } else {
//       setMessage('Registration successful! Check your email for a confirmation link.');
//     }
//   };



//     return (
//   <>
//    <Nav/>

//     <div className="flex items-center justify-center min-h-screen bg-gray-100 ">
//       <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-lg mt-2">
//      <Image src="/assets/logo.svg" alt="ww" width={100} height={100}  />
     
//         <h2 className="text-2xl font-bold text-center text-gray-800">
//           הרשמה
//         </h2>
//         <form className="space-y-4" onSubmit={handleSignUp}  >
//           {/* Full Name Field */}
//           <div>
//             <label
//               htmlFor="fullName"
//               className="block mb-2 text-sm font-medium text-gray-600"
//             >
//               שם מלא
//             </label>
//             <input
//               type="text"
//               value={fullName}
//               onChange={(e) => setFullName(e.target.value)}
//               name="fullName"
//               placeholder="הזן את שמך המלא"
//               required
//               className="focus:bg-orange-50 w-full px-4 py-2 border rounded-lg focus:ring focus:ring-blue-300 focus:outline-none"
//             />
//           </div>

//           {/* Email Field */}
//           <div>
//             <label
//               htmlFor="email"
//               className="block mb-2 text-sm font-medium text-gray-600"
//             >
//               אימייל
//             </label>
//             <input
//              value={email}
//              onChange={(e) => setEmail(e.target.value)}
//              type="email"             
//               name="email"
//               placeholder="example@email.com"
//               required
//               className="focus:bg-orange-50 w-full px-4 py-2 border rounded-lg focus:ring focus:ring-blue-300 focus:outline-none"
//             />
//           </div>

//           {/* Phone Field */}
//           <div>
//             <label
//               htmlFor="phone"
//               className="block mb-2 text-sm font-medium text-gray-600"
//             >
//               טלפון
//             </label>
//             <input
//               type="text"
//               value={phone}
//               onChange={(e) => setPhone(e.target.value)}
//               id="phone"
//               name="phone"
//               placeholder="0501234567"
//               required
//               pattern="\d*"
//               className="focus:bg-orange-50 w-full px-4 py-2 border rounded-lg focus:ring focus:ring-blue-300 focus:outline-none"
//               onInput={(e) =>
//                 (e.currentTarget.value = e.currentTarget.value.replace(
//                   /[^0-9]/g,
//                   ""
//                 ))
//               }
//             />
//           </div>

//           {/* Password Field */}
//           <div>
//             <label
//               htmlFor="password"
//               className="block mb-2 text-sm font-medium text-gray-600"
//             >
//               סיסמה
//             </label>
//             <input
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               type="password"
//               id="password"
//               name="password"
//               placeholder="********"
//               required
//               className="focus:bg-orange-50 w-full px-4 py-2 border rounded-lg focus:ring focus:ring-blue-300 focus:outline-none"
//             />
//           </div>

//           {/* Submit Button */}
//           <button
//             type="submit"
//             className="w-full px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-500 focus:ring focus:ring-green-300 focus:outline-none"
//           >
//             הרשמה
//           </button>
//         </form>

//          {message && <p className="mt-4 text-center text-red-500">{message}</p>}
//         {/* Divider */}
//         <div className="flex items-center justify-between">
//           <hr className="w-full border-gray-300" />
//           <span className="px-2 text-sm text-gray-500">או</span>
//           <hr className="w-full border-gray-300" />
//         </div>

//         {/* Google Sign Up Button */}
//         <button
//           type="button"
//           className="flex items-center justify-center w-full px-4 py-2 text-gray-700 bg-white border rounded-lg shadow-sm hover:bg-gray-100 focus:ring focus:ring-gray-200 focus:outline-none"
//         >
//             <div className="h-8 w-8">
//             <GoogleIcon/>
//             </div>
//           {/* כאן נכניס אייקון גוגל*/}
//           הרשמה עם Google
//         </button>
//       </div>
//     </div>
// </>

//   );
// }





