'use server'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function signUp(formData: FormData) {
  const fullName = formData.get('fullName') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = createServerActionClient({ cookies })

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        data: { full_name: fullName },
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: 'נרשמת בהצלחה! בדוק את האימייל שלך 📬' }
}
