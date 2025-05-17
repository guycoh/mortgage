
import { NextResponse } from 'next/server';
import xml2js from 'xml2js';

export async function GET() {
  try {
    const res = await fetch('https://api.cbs.gov.il/index/data/price_all?lang=en');
    const xml = await res.text();

    const parser = new xml2js.Parser({ explicitArray: false });
    const jsonData = await parser.parseStringPromise(xml);

    return NextResponse.json(jsonData);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch CPI data' }, { status: 500 });
  }
}
