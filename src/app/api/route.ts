import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
    // Ejemplo: obtener todos los participantes
    const data = await db.participant.findMany();
    return NextResponse.json(data);
}

export async function POST(request: Request) {
    const body = await request.json();
    // Ejemplo: crear un participante
    const result = await db.participant.create({ data: body });
    return NextResponse.json(result);
}