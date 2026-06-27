import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { indexId: string } }
) {
  const { indexId } = params; // מקבל את מזהה המדד מהנתיב

  // דוגמה: /api/cbs/210250 ימשוך את מדד מחירי הדירות
  const cbsUrl = `https://api.cbs.gov.il/index/data/price?id=${indexId}&from=2020-01&format=json&download=false`;

  try {
    const response = await fetch(cbsUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 ...',
        'Accept': 'application/json',
      },
      next: { revalidate: 86400 }
    });

    if (!response.ok) return NextResponse.json({ success: false }, { status: response.status });

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}