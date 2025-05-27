import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') || 'nature';

  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${query}&per_page=12`,
    {
      headers: {
        Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
      },
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
