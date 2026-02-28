import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';

export async function GET(request: Request) {
    const db = await connectToDatabase();
    const data = await db.collection('yourCollectionName').find({}).toArray();
    return NextResponse.json(data);
}

export async function POST(request: Request) {
    const db = await connectToDatabase();
    const body = await request.json();
    const result = await db.collection('yourCollectionName').insertOne(body);
    return NextResponse.json(result);
}