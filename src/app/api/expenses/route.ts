import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET all expenses
export async function GET() {
  try {
    const expenses = await db.expense.findMany({
      orderBy: { date: 'desc' }
    });
    return NextResponse.json(expenses);
  } catch (error) {
    console.error('GET /api/expenses error', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

// POST create expense
export async function POST(request: NextRequest) {
  try {
    const { name, amount, date } = await request.json();
    
    if (!name || !amount || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const expense = await db.expense.create({
      data: {
        name,
        amount: Number(amount),
        date,
      }
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
