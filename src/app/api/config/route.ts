import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_CONFIG } from '@/lib/utils';

// GET config
export async function GET() {
  try {
    const configEntries = await db.config.findMany();
    
    if (configEntries.length === 0) {
      return NextResponse.json(DEFAULT_CONFIG);
    }

    const config: Record<string, any> = {};
    configEntries.forEach(entry => {
      try {
        config[entry.key] = JSON.parse(entry.value);
      } catch {
        config[entry.key] = entry.value;
      }
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('GET /api/config error', error);
    return NextResponse.json(DEFAULT_CONFIG);
  }
}

// POST save config
export async function POST(request: NextRequest) {
  try {
    const configData = await request.json();

    // Delete all existing config
    await db.config.deleteMany({});

    // Save new config
    const configEntries = Object.entries(configData).map(([key, value]) => ({
      key,
      value: typeof value === 'string' ? value : JSON.stringify(value),
    }));

    await Promise.all(
      configEntries.map(entry =>
        db.config.create({ data: entry })
      )
    );

    return NextResponse.json(configData, { status: 201 });
  } catch (error) {
    console.error('POST /api/config error', error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}
