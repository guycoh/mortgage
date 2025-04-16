import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get("redirect_to");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Exchange code error:", error.message);
      return NextResponse.redirect(`${origin}/sign-in?error=auth`);
    }
  }

  // אם מוגדר redirect_to בפרמטרים, נשתמש בו
  if (redirectTo) {
    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  // ברירת מחדל לאחר אימות משתמש
  return NextResponse.redirect(`${origin}/private/profile`);
}







//מקורי
// import { createClient } from "@/utils/supabase/server";
// import { NextResponse } from "next/server";

// export async function GET(request: Request) {
//   // The `/auth/callback` route is required for the server-side auth flow implemented
//   // by the SSR package. It exchanges an auth code for the user's session.
//   // https://supabase.com/docs/guides/auth/server-side/nextjs
//   const requestUrl = new URL(request.url);
//   const code = requestUrl.searchParams.get("code");
//   const origin = requestUrl.origin;
//   const redirectTo = requestUrl.searchParams.get("redirect_to")?.toString();

//   if (code) {
//     const supabase = await createClient();
//     await supabase.auth.exchangeCodeForSession(code);
//   }

//   if (redirectTo) {
//     return NextResponse.redirect(`${origin}${redirectTo}`);
//   }

//   // URL to redirect to after sign up process completes
//   return NextResponse.redirect(`${origin}/protected`);
// }
