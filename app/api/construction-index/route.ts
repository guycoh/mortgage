import { NextResponse } from 'next/server';

export async function GET() {
  const INDEX_ID = '200010'; 
  
  // שימוש בטווח תאריכים קבוע (מ-2020-01 ועד היום) במקום last=80
  const cbsUrl = `https://api.cbs.gov.il/index/data/price?id=${INDEX_ID}&from=2020-01&format=json&download=false`;

  try {
    const response = await fetch(cbsUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      next: { revalidate: 86400 }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `שרת הלמ"ס החזיר שגיאה: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
    
  } catch (error: any) {
    console.error('שגיאה בפנייה ל-API של הלמ"ס:', error);
    return NextResponse.json(
      { error: 'שגיאה פנימית בשרת בעת משיכת הנתונים', details: error.message },
      { status: 500 }
    );
  }
}