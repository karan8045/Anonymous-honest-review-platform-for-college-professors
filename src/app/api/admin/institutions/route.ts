import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get('country') || undefined;
  const all = db.getAllInstitutions(country);
  return NextResponse.json({ institutions: all });
}
