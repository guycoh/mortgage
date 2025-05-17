// app/api/exchange-rates/route.ts


import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://boi.org.il/PublicApi/GetExchangeRates');
    const data = await res.json();
    return NextResponse.json(data.exchangeRates); // ← חייב להחזיר את המערך עצמו
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch exchange rates' }, { status: 500 });
  }
}
