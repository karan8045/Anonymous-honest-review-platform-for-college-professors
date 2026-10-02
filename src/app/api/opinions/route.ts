import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { syncOpinionToSupabase } from '@/lib/supabase-sync';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'You must be signed in to submit an opinion.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { institution_id, content } = body;

    if (!institution_id) {
      return NextResponse.json(
        { error: 'Institution ID is required.' },
        { status: 400 }
      );
    }

    const trimmed = (content || '').trim();
    if (trimmed.length < 10) {
      return NextResponse.json(
        { error: 'Your opinion must be at least 10 characters long.' },
        { status: 400 }
      );
    }
    if (trimmed.length > 3000) {
      return NextResponse.json(
        { error: 'Your opinion cannot exceed 3000 characters.' },
        { status: 400 }
      );
    }

    const opinion = db.createOpinion({
      institution_id,
      user_id: user.id,
      content: trimmed,
    });

    await syncOpinionToSupabase({
      id: opinion.id,
      institution_id: opinion.institution_id,
      user_id: opinion.user_id,
      username: opinion.username || opinion.author_username,
      name: opinion.name,
      content: opinion.content,
    });

    return NextResponse.json({
      success: true,
      opinion: {
        id: opinion.id,
        institution_id: opinion.institution_id,
        author_username: opinion.author_username,
        author_avatar: opinion.author_avatar,
        content: opinion.content,
        created_at: opinion.created_at,
        is_current_user: true,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to submit opinion.' },
      { status: 500 }
    );
  }
}
