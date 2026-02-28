export const runtime = 'nodejs';

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET all participants
export async function GET() {
  try {
    const participants = await db.participant.findMany({
      orderBy: { joinDate: 'desc' }
    });
    return NextResponse.json(participants);
  } catch (error) {
    console.error('GET /api/participants error', error);
    return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 });
  }
}

// POST create participant
export async function POST(request: NextRequest) {
  try {
    const { name, phone, notes } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const participant = await db.participant.create({
      data: {
        name,
        phone: phone || null,
        notes: notes || null,
      }
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create participant' }, { status: 500 });
  }
}
