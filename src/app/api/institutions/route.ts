import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get('country') || undefined;
  const query = searchParams.get('q') || undefined;
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  const results = db.searchInstitutions({
    country,
    query,
    limit,
  });

  return NextResponse.json({ institutions: results });
}
