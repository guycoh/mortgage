'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { signOutAction } from '@/app/actions';
import { useRouter } from 'next/navigation';


type Profile = {
  full_name: string;
  role: string;
};

type UserContextType = {
  user: any;
  profile: Profile | null;
  role: string | null;
  isLoading: boolean;
  error: string | null;
  logout: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);



export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();



  const fetchUserAndProfile = async () => {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setUser(null);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setUser(user);

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

    setIsLoading(false);
  };

 
const logout = async () => {
  await signOutAction();
  setUser(null);
  setProfile(null);
     window.location.reload(); // רענון כל הדף מהמיקום הנוכחי
};






useEffect(() => {
  const supabase = createClient();

  const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      setUser(null);
      setProfile(null);
    }

    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      fetchUserAndProfile();
    }
  });

  // טוען פעם ראשונה
  fetchUserAndProfile();

  return () => {
    authListener.subscription.unsubscribe();
  };
}, []);


  return (
    <UserContext.Provider value={{
      user,
      profile,
      role: profile?.role ?? null,
      isLoading,
      error,
      logout
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
