// "use client"

// import Image from 'next/image'
// import { useState } from 'react'
// import { signup } from './actions'
// import { signup } from '../login/actions'

// export default function SignupForm() {
//   const [message, setMessage] = useState('')
//   const [fields, setFields] = useState({
//     fullName: '',
//     email: '',
//     password: '',
//     confirmPassword: '',
//     phone: ''
//   })

//   const [touched, setTouched] = useState({
//     fullName: false,
//     email: false,
//     password: false,
//     confirmPassword: false,
//     phone: false
//   })

//   const validate = {
//     fullName: (val: string) => val.trim().length > 0,
//     email: (val: string) => /\S+@\S+\.\S+/.test(val),
//     password: (val: string) => val.length >= 6,
//     confirmPassword: (val: string) => val === fields.password,
//     phone: (val: string) => /^[0-9]{9,10}$/.test(val)
//   }

//   const isFieldValid = (name: keyof typeof fields) => validate[name](fields[name])
//   const isFieldInvalid = (name: keyof typeof fields) => touched[name] && !isFieldValid(name)

//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value } = e.target
//     setFields((prev) => ({ ...prev, [name]: value }))
//     setTouched((prev) => ({ ...prev, [name]: true }))
//   }

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     const allValid = Object.keys(fields).every((key) => validate[key as keyof typeof fields](fields[key as keyof typeof fields]))

//     if (!allValid) {
//       setTouched({
//         fullName: true,
//         email: true,
//         password: true,
//         confirmPassword: true,
//         phone: true
//       })
//       return
//     }

//     const formData = new FormData()
//     formData.append('fullName', fields.fullName)
//     formData.append('email', fields.email)
//     formData.append('password', fields.password)
//     formData.append('phone', fields.phone)

//     const res = await signUp(formData)
//     setMessage('error' in res ? res.error ?? '' : res.success)
//   }

//   return (
//     <div className="flex justify-center items-center min-h-screen p-4">

//       <div className="flex flex-col md:flex-row-reverse bg-white shadow-2xl rounded-2xl overflow-hidden w-full max-w-5xl">
        
//         {/* לוגו בצד ימין (רק במסכים md ומעלה) */}
//         <div className="hidden md:flex items-center justify-center w-1/2 bg-white p-8">
//           <Image
//             src="/assets/myLogo.svg"
//             alt="Morgi Logo"
//             width={350}
//             height={350}
//             className="object-contain"
//           />
//         </div>

//         {/* טופס */}
//         <form
//           onSubmit={handleSubmit}
//           className="w-full md:w-1/2 p-10 space-y-6"
//         >
//           <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">ברוכים הבאים למורגי 🎉</h2>
//           <p className="text-center text-gray-500 mb-6">הצטרפו אלינו עכשיו כדי לקבל את ההצעות הכי משתלמות!</p>

//           {[
//             { label: 'שם מלא', name: 'fullName', type: 'text', placeholder: 'הכנס את שמך המלא' },
//             { label: 'אימייל', name: 'email', type: 'email', placeholder: 'your@email.com' },
//             { label: 'טלפון', name: 'phone', type: 'tel', placeholder: '0501234567' },
//             { label: 'סיסמה', name: 'password', type: 'password', placeholder: 'מינימום 6 תווים' },
//             { label: 'אישור סיסמה', name: 'confirmPassword', type: 'password', placeholder: 'הקלד שוב את הסיסמה' }
//           ].map(({ label, name, type, placeholder }) => (
//             <div key={name}>
//               <label className="block text-md font-medium text-gray-700 mb-1">
//                 {label}
//                 <span className={`ml-1 transition ${isFieldValid(name as keyof typeof fields) ? 'invisible' : 'text-red-500'}`}>*</span>
//               </label>
//               <input
//                 type={type}
//                 name={name}
//                 value={fields[name as keyof typeof fields]}
//                 onChange={handleInputChange}
//                 onBlur={() => setTouched((prev) => ({ ...prev, [name]: true }))}
//                 placeholder={placeholder}
//                 className={`w-full px-4 py-3 rounded-xl border transition 
//                   ${isFieldInvalid(name as keyof typeof fields)
//                     ? 'border-red-500'
//                     : 'border-gray-300 focus:border-indigo-500'}`}
//                 required
//               />
//             </div>
//           ))}

//           <button
//             type="submit"
//             className="w-full bg-indigo-600 text-white text-lg font-medium py-3 rounded-xl hover:bg-indigo-700 transition"
//           >
//             הרשמה
//           </button>

//           {message && (
//             <p className="text-center text-sm mt-4 text-gray-700">{message}</p>
//           )}
//         </form>
//       </div>
//     </div>
//   )
// }







// 'use client'

// import { useState } from 'react'
// import { signUp } from './action'

// export default function SignupForm() {
//   const [message, setMessage] = useState('')

//   async function handleSubmit(formData: FormData) {
//     const res = await signUp(formData)

//     if ('error' in res) {    
//       setMessage(res.error ?? '')
   
//     } else {
//       setMessage(res.success)
//     }
//   }

//   return (
//     <form
//       action={handleSubmit}
//       className="space-y-4 max-w-md mx-auto bg-white p-6 rounded-xl shadow-xl mt-10"
//     >
//       <h2 className="text-2xl font-bold text-center text-gray-800">הרשמה למורגי</h2>

//       <input
//         name="fullName"
//         placeholder="שם מלא"
//         className="w-full px-4 py-2 border rounded-xl"
//         required
//       />
//       <input
//         type="email"
//         name="email"
//         placeholder="אימייל"
//         className="w-full px-4 py-2 border rounded-xl"
//         required
//       />
//       <input
//         type="password"
//         name="password"
//         placeholder="סיסמה"
//         className="w-full px-4 py-2 border rounded-xl"
//         required
//       />

//       <button
//         type="submit"
//         className="w-full bg-indigo-600 text-white py-2 rounded-xl hover:bg-indigo-700 transition"
//       >
//         הרשמה
//       </button>

//       {message && (
//         <p className="text-center text-sm mt-4 text-gray-700">{message}</p>
//       )}
//     </form>
//   )
// }
