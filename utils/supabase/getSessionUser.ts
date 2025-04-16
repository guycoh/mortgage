import { createClient } from "@/utils/supabase/server";

export const getSessionUser = async () => {
  const supabase = await createClient(); // 🟢 שים לב ל־await פה

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      isLoggedIn: false,
      user: null,
    };
  }

  return {
    isLoggedIn: true,
    user: {
      email: user.email,
      fullName: user.user_metadata?.full_name || "",
      role: user.user_metadata?.role || "user",
    },
  };
};
