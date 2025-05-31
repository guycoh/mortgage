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





// 'use client';

// import { useEffect, useState } from "react";
// import { createClient } from "@/utils/supabase/client";
// import { useTransition } from 'react';
// import { signOutAction } from "@/app/actions";
// import Link from "next/link";

// export default function UserInfo() {
//   const [user, setUser] = useState<any>(null);
//   const [profile, setProfile] = useState<any>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [isPending, startTransition] = useTransition();

//   const handleLogout = () => {
//     startTransition(() => {
//       signOutAction();
//     });
//   };

//   useEffect(() => {
//     const fetchUserAndProfile = async () => {
//       const supabase = createClient();

//       const {
//         data: { user },
//         error: userError,
//       } = await supabase.auth.getUser();

//       if (userError || !user) {
//         setUser(null);
//         setProfile(null);
//         return;
//       }

//       setUser(user);

//       const { data: profileData, error: profileError } = await supabase
//         .from("profiles")
//         .select("full_name, role")
//         .eq("id", user.id)
//         .single();

//       if (profileError) {
//         setError(profileError.message);
//       } else {
//         setProfile(profileData);
//       }
//     };

//     fetchUserAndProfile();
//   }, []);

//   if (error) return <p className="text-red-500">שגיאה: {error}</p>;

//   return (
//     <div className="flex items-center gap-4 text-sm">
//       {/* אם המשתמש מחובר */}
//       {user && profile ? (
//         <>
//           <p>שלום <strong>{profile.full_name}</strong></p>
//           <button
//             onClick={handleLogout}
//             disabled={isPending}
//             className="text-white bg-main rounded-lg px-5 py-2.5"
//           >
//             {isPending ? 'מתנתק...' : 'התנתק'}
//           </button>
//         </>
//       ) : (
//         // אם המשתמש לא מחובר
//         <>
//           <Link href="/login"  className="text-white bg-main rounded-lg px-5 py-2.5">
//             התחבר
//           </Link>
//           <Link href="/register"  className="text-white bg-main rounded-lg px-5 py-2.5">
//             הרשמה
//           </Link>
//         </>
//       )}
//     </div>
//   );
// }





































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