export const runtime = 'nodejs';

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// DELETE expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.expense.delete({
      where: { id: Number(id) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {    console.error('GET /api/expenses/[id] error', error);    console.error('DELETE /api/expenses/[id] error', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}

// PATCH update expense
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const { name, amount, date } = data;

    const expense = await db.expense.update({
      where: { id: Number(params.id) },
      data: {
        name,
        amount: Number(amount),
        date,
      }
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error('PATCH /api/expenses/[id] error', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}