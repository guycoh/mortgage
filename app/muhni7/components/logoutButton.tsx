'use client';

//import { useUser } from '@/context/UserContext';
import Link from "next/link";
import { useUser } from "@/app/context/UserContext";


export default function UserInfo() {
  const { user, profile, isLoading, logout, error } = useUser();

  if (isLoading) return null;
  if (error) return <p className="text-red-500">שגיאה: {error}</p>;

  return (
    <div className="flex items-center gap-4 text-sm">
      {user && profile ? (
        <>
          <p>שלום <strong>{profile.full_name}</strong></p>
          <button
            onClick={logout}
            className="text-white bg-main rounded-lg px-5 py-2.5"
          >
            התנתק
          </button>
        </>
      ) : (
        <>
          <Link href="/login" className="text-white bg-main rounded-lg px-5 py-2.5">
            התחבר
          </Link>
          <Link href="/register" className="text-white bg-main rounded-lg px-5 py-2.5">
            הרשמה
          </Link>
        </>
      )}
    </div>
  );
}


























 {/* {user.email ? (
  <div className="flex items-center gap-4">
    <p className="text-sm">
      <strong>שלום</strong> {profile.full_name}
    </p>
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="text-white bg-[#1d75a1] rounded-lg text-sm px-5 py-2.5"
    >
      {isPending ? 'מתנתק...' : 'התנתק'}
    </button>
  </div>
) : (
  <div className="flex items-center gap-4">
    <Link
      href="/sign-in"
      className="text-white bg-[#1d75a1] rounded-lg text-sm px-5 py-2.5"
    >
      התחברות
    </Link>
    <Link
      href="/sign-up"
      className="text-white bg-[#1d75a1] rounded-lg text-sm px-5 py-2.5"
    >
      הרשמה
    </Link>
  </div>
)} */}