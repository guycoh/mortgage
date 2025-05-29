// import { NextRequest, NextResponse } from 'next/server';

// export async function GET(req: NextRequest) {
//   const url = req.nextUrl;
//   const query = url.searchParams.get('q') || 'nature';
//   const page  = url.searchParams.get('page') || '1';

//   const res = await fetch(
//     `https://api.pexels.com/v1/search?query=${query}&per_page=15&page=${page}`,
//     {
//       headers: { Authorization: process.env.PEXELS_API_KEY || '' },
//     }
//   );

//   if (!res.ok) {
//     return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
//   }

//   const data = await res.json();
//   return NextResponse.json(data);
// }
