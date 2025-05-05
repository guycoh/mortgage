'use client';

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useTransition } from 'react';
import {  signOutAction } from "@/app/actions";
import Link from "next/link"


export default function UserInfo() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(() => {
      signOutAction();
    });
  };

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const supabase = createClient();

      // קבל את המשתמש המחובר
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(userError?.message || "User not found");
        return;
      }

      setUser(user);

      // קבל את הפרופיל של המשתמש
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        setError(profileError.message);
      } else {
        setProfile(profileData);
      }
    };

    fetchUserAndProfile();
  }, []);

//  if (error) return <p className="text-red-500">שגיאה: {error}</p>;
//  if (!user || !profile) return <p>טוען...</p>;

  if (error) return <p > </p>;
  if (!user || !profile) return <p>טוען...</p>;


  return (
    <div >    
   {user.email ? (
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
)}

   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
    {/* {user.email && (
      <div className="flex items-center gap-4 ">
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
    )} */}









{/* <p><strong>שם מלא:</strong> {profile.full_name}</p>
      <p><strong>תפקיד:</strong> {profile.role}</p>
      <p><strong>מזהה:</strong> {user.id}</p> */}



  </div>
  
    
  );
}

