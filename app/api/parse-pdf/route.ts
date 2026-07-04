import { NextRequest, NextResponse } from 'next/server';
import * as pdfParse from 'pdf-parse';

export async function POST(req: NextRequest) {
  try {
    // 1. קבלת ה-FormData מהבקשה
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const pdfParse = require('pdf-parse');
    // בדיקה שהקובץ אכן קיים ונשלח
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'לא נמצא קובץ להעלאה' }, 
        { status: 400 }
      );
    }

    // 2. המרת ה-File ל-ArrayBuffer ואז ל-Buffer לצורך עיבוד ב-Node.js
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 3. חילוץ הטקסט הגולמי מתוך ה-PDF באמצעות pdf-parse
    const pdfData = await pdfParse(buffer);
    const extractedText = pdfData.text;

    // 4. החזרת הטקסט המפוענח לצד הלקוח (הדפדפן)
    return NextResponse.json({ 
      success: true, 
      text: extractedText,
      numPages: pdfData.numpages // מספר העמודים בדוח לשם בקרה
    });

  } catch (error: any) {
    console.error('PDF parsing error:', error);
    return NextResponse.json(
      { success: false, error: 'שגיאה בפענוח קובץ ה-PDF: ' + error.message }, 
      { status: 500 }
    );
  }
}