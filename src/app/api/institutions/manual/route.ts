import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, country, city } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'College or university name is required.' },
        { status: 400 }
      );
    }

    if (!country || !country.trim()) {
      return NextResponse.json(
        { error: 'Country is required.' },
        { status: 400 }
      );
    }

    const institution = db.createManualInstitution({
      name: name.trim(),
      country: country.trim(),
      city: (city || '').trim(),
    });

    return NextResponse.json({
      success: true,
      institution,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to add manual institution.' },
      { status: 500 }
    );
  }
}
