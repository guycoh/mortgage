//דף זה יפנה לכל שגיאה באתר

// app/not-found.tsx


import { redirect } from 'next/navigation';

export default function NotFound() {
  redirect('/muhni'); // מפנה לדף הבית
}
