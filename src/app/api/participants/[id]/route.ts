import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET single participant
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const participant = await db.participant.findUnique({
      where: { id: Number(id) }
    });

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    return NextResponse.json(participant);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch participant' }, { status: 500 });
  }
}

// PATCH update participant
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const data = await request.json();
    const { id } = await params;
    const participant = await db.participant.update({
      where: { id: Number(id) },
      data
    });

    return NextResponse.json(participant);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update participant' }, { status: 500 });
  }
}

// DELETE participant
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.participant.delete({
      where: { id: Number(id) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete participant' }, { status: 500 });
  }
}
