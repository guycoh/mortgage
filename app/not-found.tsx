//דף זה יפנה לכל שגיאה באתר

// app/not-found.tsx


import { redirect } from 'next/navigation';

export default function NotFound() {
  redirect('/home'); // מפנה לדף הבית
}
