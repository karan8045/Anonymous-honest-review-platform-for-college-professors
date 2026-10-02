import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  if (!verifyAdminAccess(req)) {
    return NextResponse.json(
      { error: 'Unauthorized: Administrative merge requires valid ADMIN_SECRET.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { sourceId, targetId } = body;

    if (!sourceId || !targetId) {
      return NextResponse.json(
        { error: 'Source institution ID and Target institution ID are required.' },
        { status: 400 }
      );
    }

    const result = db.mergeInstitutions(sourceId, targetId);

    return NextResponse.json({
      success: true,
      message: `Successfully merged duplicate institution into canonical institution. Moved ${result.movedRatings} rating(s) and ${result.movedOpinions} opinion(s).`,
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to merge institutions.' },
      { status: 500 }
    );
  }
}
