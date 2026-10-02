import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { syncRatingToSupabase } from '@/lib/supabase-sync';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'You must be signed in to submit a rating.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { institution_id, score } = body;

    if (!institution_id) {
      return NextResponse.json(
        { error: 'Institution ID is required.' },
        { status: 400 }
      );
    }

    const scoreNum = Number(score);
    if (!scoreNum || scoreNum < 1 || scoreNum > 5 || !Number.isInteger(scoreNum)) {
      return NextResponse.json(
        { error: 'Rating must be a whole number between 1 and 5.' },
        { status: 400 }
      );
    }

    // Submit rating (strictly enforces single rating per user per institution)
    const rating = db.submitRating({
      institution_id,
      user_id: user.id,
      score: scoreNum,
    });

    await syncRatingToSupabase({
      id: rating.id,
      institution_id: rating.institution_id,
      user_id: rating.user_id,
      username: rating.username,
      name: rating.name,
      score: rating.score,
    });

    const updatedInst = db.getInstitutionById(institution_id);

    return NextResponse.json({
      success: true,
      rating: {
        score: rating.score,
        created_at: rating.created_at,
      },
      institution: updatedInst,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to submit rating.' },
      { status: 500 }
    );
  }
}
