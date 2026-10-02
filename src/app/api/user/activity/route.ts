import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const ratings = db.getUserRatingsList(user.id);
  const opinions = db.getUserOpinionsList(user.id);

  return NextResponse.json({
    user,
    ratings,
    opinions,
  });
}
