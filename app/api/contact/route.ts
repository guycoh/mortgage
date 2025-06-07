// app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY); // ודא שזה קיים בקובץ .env.local

export async function POST(req: NextRequest) {
  try {
    const { name, email, message,phone } = await req.json();

    const data = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev', // חובה שיהיה מאומת
      to: process.env.RESEND_TO_EMAIL || 'guycoh44@gmail.com',
      cc: ['guy.cohen@muhni.co.il', 'guycoh@outlook.co.il'],
     
      subject: `טופס יצירת קשר מ-${name}`,
      html: `
        <h2 >הודעה חדשה מהאתר</h2>
        <p><strong>שם:</strong> ${name}</p>
        <p><strong>אימייל:</strong> ${email}</p>
        <p><strong>הודעה:</strong><br/>${message}</p>
        <p><strong>הודעה:</strong><br/>${phone}</p>
      `,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('שגיאה בשליחת המייל:', error);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
