import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { setSessionCookie } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required.' },
        { status: 400 }
      );
    }

    const profile = await db.verifyUser({
      username: username.trim(),
      password,
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Invalid username or password. Please check your credentials.' },
        { status: 401 }
      );
    }

    // Set persistent session cookie (30 days)
    await setSessionCookie(profile.id);

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        username: profile.username,
        country: profile.country,
        institution_id: profile.institution_id,
        institution_name: profile.institution_name,
      },
    });
  } catch (error: any) {
    console.error('Signin error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during signin.' },
      { status: 500 }
    );
  }
}
