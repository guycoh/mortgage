"use client"
import Hero from "@/components/hero";
import ConnectSupabaseSteps from "@/components/tutorial/connect-supabase-steps";
import SignUpUserSteps from "@/components/tutorial/sign-up-user-steps";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { useEffect } from "react";

// NOT async: React rejects an async Client Component, and this one also calls
// useEffect. It threw on every load and the redirect below fired unreliably.
export default function Home() {
 
  useEffect(() => {
    window.location.href = '/muhni';
  }, []);

 
  
  
  return (
    <>
{/*       
      <Hero />
       */}
      
      
      <main className="flex-1 flex flex-col gap-6 px-4">
     
{/*        
        <h2 className="font-medium text-xl mb-4">Next steps</h2>
        {hasEnvVars ? <SignUpUserSteps /> : <ConnectSupabaseSteps />}
      
       */}
      
      
      </main>
    </>
  );
}
