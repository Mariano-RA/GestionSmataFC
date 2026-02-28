import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET all payments
export async function GET() {
  try {
    const payments = await db.payment.findMany({
      orderBy: { date: 'desc' }
    });
    return NextResponse.json(payments);
  } catch (error) {
    console.error('GET /api/payments error', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

// POST create payment
export async function POST(request: NextRequest) {
  try {
    const { participantId, date, amount, method, note } = await request.json();
    
    if (!participantId || !date || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const payment = await db.payment.create({
      data: {
        participantId,
        date,
        amount: Number(amount),
        method: method || null,
        note: note || null,
      }
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}
