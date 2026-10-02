import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username') || '';

  if (!username.trim()) {
    return NextResponse.json({ available: false, reason: 'Username cannot be empty.' });
  }

  const valid = db.isUsernameValid(username);
  if (!valid.valid) {
    return NextResponse.json({ available: false, reason: valid.reason });
  }

  const available = db.isUsernameAvailable(username);
  if (!available) {
    return NextResponse.json({ available: false, reason: 'This username is already taken.' });
  }

  return NextResponse.json({ available: true });
}
