// app/api/interest/route.ts

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://www.boi.org.il/PublicApi/GetInterest');
    const data = await res.json();

    const interest = data?.currentInterest;
    const nextDate = data?.nextInterestDate;

    if (typeof interest === 'number') {
      return NextResponse.json({
        interest,
        prime: interest + 1.5,
        nextDate,
      });
    } else {
      return NextResponse.json({ error: 'Invalid data from BOI' }, { status: 500 });
    }
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch from BOI' }, { status: 500 });
  }
}
