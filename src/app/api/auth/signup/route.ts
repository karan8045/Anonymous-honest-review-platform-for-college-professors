import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { setSessionCookie } from '@/lib/session';
import { syncProfileToSupabase } from '@/lib/supabase-sync';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      username,
      avatar,
      password,
      confirmPassword,
      country,
      institution_id,
      manualInstitutionName,
      acknowledgedRecoveryWarning,
    } = body;

    // 1. Check Avatar (Compulsory: only 'male' or 'female')
    if (!avatar || (avatar !== 'male' && avatar !== 'female')) {
      return NextResponse.json(
        { error: 'Choosing an avatar is compulsory. Please select either Male or Female.' },
        { status: 400 }
      );
    }

    // 2. Check Irreversible Password Warning Acknowledgement
    if (!acknowledgedRecoveryWarning) {
      return NextResponse.json(
        {
          error:
            'You must acknowledge that your password cannot be recovered if lost before creating an account.',
        },
        { status: 400 }
      );
    }

    // 2. Validate Username
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required.' }, { status: 400 });
    }
    const usernameValidation = db.isUsernameValid(username);
    if (!usernameValidation.valid) {
      return NextResponse.json({ error: usernameValidation.reason }, { status: 400 });
    }
    if (!db.isUsernameAvailable(username)) {
      return NextResponse.json(
        { error: 'Username is already taken. Please choose another.' },
        { status: 400 }
      );
    }

    // 3. Validate Password
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    // 4. Validate Country
    if (!country || typeof country !== 'string' || !country.trim()) {
      return NextResponse.json({ error: 'Please select your country.' }, { status: 400 });
    }

    // 5. Handle Institution (either selected or manual "Not Available")
    let finalInstitutionId = institution_id;

    if (manualInstitutionName && manualInstitutionName.trim()) {
      // Create user-submitted institution
      const manualInst = db.createManualInstitution({
        name: manualInstitutionName.trim(),
        country: country.trim(),
      });
      finalInstitutionId = manualInst.id;
    }

    if (!finalInstitutionId) {
      return NextResponse.json(
        { error: 'Please select or add your college/university.' },
        { status: 400 }
      );
    }

    // 6. Create User & Profile securely
    const { user, profile } = await db.createUser({
      username: username.trim(),
      avatar,
      password,
      country: country.trim(),
      institution_id: finalInstitutionId,
    });

    // 6b. Automatically sync signup to Supabase when configured
    await syncProfileToSupabase({
      id: profile.id,
      username: profile.username,
      name: profile.name || profile.username,
      avatar: profile.avatar,
      country: profile.country,
      institution_id: profile.institution_id,
    });

    // 7. Establish persistent session
    await setSessionCookie(user.id);

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        username: profile.username,
        avatar: profile.avatar,
        country: profile.country,
        institution_id: profile.institution_id,
        institution_name: profile.institution_name,
      },
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during signup.' },
      { status: 500 }
    );
  }
}
