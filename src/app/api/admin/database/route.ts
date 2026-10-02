import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const DATA_DIR = path.join(process.cwd(), '.data');
    const DB_FILE = path.join(DATA_DIR, 'db.json');

    let rawData: any = {
      users: [],
      profiles: [],
      institutions: [],
      ratings: [],
      opinions: [],
    };

    if (fs.existsSync(DB_FILE)) {
      rawData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    }

    // Sanitize users list: omit password hashes from admin view for privacy & security
    const safeUsers = (rawData.users || []).map((u: any) => ({
      id: u.id,
      username: u.username,
      created_at: u.created_at,
    }));

    // Attach institution names to profiles, ratings, and opinions for easy reading
    const instMap = new Map((rawData.institutions || []).map((i: any) => [i.id, i.name]));

    const enrichedProfiles = (rawData.profiles || []).map((p: any) => ({
      ...p,
      institution_name: instMap.get(p.institution_id) || p.institution_name || 'Not assigned',
    }));

    const enrichedRatings = (rawData.ratings || []).map((r: any) => ({
      ...r,
      institution_name: instMap.get(r.institution_id) || 'Unknown College',
    }));

    const enrichedOpinions = (rawData.opinions || []).map((o: any) => ({
      ...o,
      institution_name: instMap.get(o.institution_id) || 'Unknown College',
    }));

    const stats = {
      totalUsers: rawData.users?.length || 0,
      totalInstitutions: rawData.institutions?.length || 0,
      officialInstitutions: (rawData.institutions || []).filter((i: any) => i.source === 'official_database').length,
      userSubmittedInstitutions: (rawData.institutions || []).filter((i: any) => i.source === 'user_submitted').length,
      totalRatings: rawData.ratings?.length || 0,
      totalOpinions: rawData.opinions?.length || 0,
    };

    return NextResponse.json({
      stats,
      data: {
        users: safeUsers,
        profiles: enrichedProfiles,
        institutions: rawData.institutions || [],
        ratings: enrichedRatings,
        opinions: enrichedOpinions,
      },
      rawFileLocation: '.data/db.json',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to read database.' },
      { status: 500 }
    );
  }
}
