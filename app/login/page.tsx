'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMsg(error.message);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-blue-200 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 flex items-center justify-center px-4">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-8 sm:p-10 max-w-md w-full">
        
        <div className="flex justify-center mb-4">
          <Image
            src="/assets/myLogo.svg"
            alt="Morgi Logo"
            width={64}
            height={64}
            className="rounded-full"
          />
        </div>

        <h2 className="text-3xl font-bold text-center text-blue-800 dark:text-blue-300 mb-2">ברוך הבא ל-Morgi</h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">התחבר לחשבון שלך כדי להמשיך</p>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">אימייל</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">סיסמה</label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
              tabIndex={-1}
              aria-label="הצג או הסתר סיסמה"
            >
              {showPassword ? (
                // עין סגורה
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.026.154-2.012.438-2.938m1.6-2.6L21 21M3 3l18 18" />
                </svg>
              ) : (
                // עין פתוחה
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {errorMsg && <p className="text-red-600 text-sm text-center">{errorMsg}</p>}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-xl transition duration-200"
            >
              התחברות
            </button>
          </div>
        </form>

        <div className="flex justify-between items-center mt-4 text-sm text-blue-600 dark:text-blue-400">
          <Link href="/forgot-password" className="hover:underline">שכחת סיסמה?</Link>
          <Link href="/signup" className="hover:underline">אין לך חשבון? הרשמה</Link>
        </div>
      </div>
    </div>
  );
}
