import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const institution = db.getInstitutionById(params.id);
  if (!institution) {
    return NextResponse.json({ error: 'Institution not found.' }, { status: 404 });
  }

  const opinions = db.getOpinionsForInstitution(params.id);
  const currentUser = await getCurrentUser();

  // Check if current user has already submitted a rating
  let userRating = null;
  if (currentUser) {
    userRating = db.getUserRating(currentUser.id, params.id);
  }

  // Never expose user_id to public clients. Map opinions safely.
  const safeOpinions = opinions.map(op => ({
    id: op.id,
    institution_id: op.institution_id,
    author_username: op.author_username,
    author_avatar: op.author_avatar || 'male',
    content: op.content,
    created_at: op.created_at,
    is_current_user: currentUser ? op.user_id === currentUser.id : false,
  }));

  return NextResponse.json({
    institution,
    userRating: userRating ? userRating.score : null,
    opinions: safeOpinions,
  });
}
