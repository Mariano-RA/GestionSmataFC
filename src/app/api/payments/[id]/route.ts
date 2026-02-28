import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// DELETE payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.payment.delete({
      where: { id: Number(id) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 });
  }
}

// PATCH update payment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { participantId, date, amount, method, note } = data;

    const payment = await db.payment.update({
      where: { id: Number(id) },
      data: {
        participantId,
        date,
        amount: Number(amount),
        method: method || null,
        note: note || null,
      }
    });

    return NextResponse.json(payment);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}
