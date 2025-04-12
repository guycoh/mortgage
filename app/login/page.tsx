import { login, signup } from './actions'
import Image from "next/image";
import Link from "next/link";


export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-blue-200 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 flex items-center justify-center px-4">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-8 sm:p-10 max-w-md w-full">
        
        <div className="flex justify-center mb-4">
          <Image
            src="assets/myLogo.svg"
            alt="Morgi Logo"
            width={64}
            height={64}
            className="rounded-full"
          />
        </div>

        <h2 className="text-3xl font-bold text-center text-blue-800 dark:text-blue-300 mb-2">ברוך הבא ל-Morgi</h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">התחבר לחשבון שלך כדי להמשיך</p>

        <form className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">אימייל</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">סיסמה</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <div className="pt-2">
            <button
              formAction={login}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-xl transition duration-200"
            >
              התחברות
            </button>
            <button formAction={signup}>Sign up</button>


          </div>
        </form>

        <div className="flex justify-between items-center mt-4 text-sm text-blue-600 dark:text-blue-400">
          <Link href="/signup" className="hover:underline"  > שכחת סיסמה?</Link>  
          <Link href="/signup" className="hover:underline"  > אין לך חשבון? הרשמה</Link> 
     
                   

       
        </div>
      </div>
    </div>
  );
}




//   export default function LoginPage() {
//   return (
//     <form>
//       <label htmlFor="email">Email:</label>
//       <input id="email" name="email" type="email" required />
//       <label htmlFor="password">Password:</label>
//       <input id="password" name="password" type="password" required />
//       <button formAction={login}>Log in</button>
//       <button formAction={signup}>Sign up</button>
//     </form>
//   )
// }