// app/api/banks/branches/route.ts
import { NextResponse } from 'next/server'

const RESOURCE_ID = '1c5bc716-8210-4ec7-85be-92e6271955c2' // מזהה של טבלת סניפי בנקים

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')
  const q = searchParams.get('q') || ''

  const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=${RESOURCE_ID}&offset=${offset}&q=${encodeURIComponent(q)}`

  try {
    const res = await fetch(url)
    if (!res.ok) {
      return NextResponse.json({ error: 'שגיאה בשליפת נתונים מה-CKAN' }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json(data.result)
  } catch (error) {
    return NextResponse.json({ error: 'שגיאה כללית בשרת', details: error }, { status: 500 })
  }
}
