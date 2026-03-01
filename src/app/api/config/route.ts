export const runtime = 'nodejs';

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_CONFIG } from '@/lib/utils';

// GET config
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const allMonths = searchParams.get('allMonths');

    if (allMonths === 'true') {
      const monthlyConfigs = await db.monthlyConfig.findMany({
        orderBy: { month: 'asc' }
      });
      return NextResponse.json(monthlyConfigs);
    }

    // Si viene month, obtener configuración mensual
    if (month) {
      const monthlyConfig = await db.monthlyConfig.findFirst({ where: { month } });
      if (monthlyConfig) {
        return NextResponse.json(monthlyConfig);
      }
      // Si no existe config para ese mes, devolver config global como fallback
    }

    // Si no, obtener configuración global
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
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const configData = await request.json();

    // Si viene month, guardar configuración mensual
    if (month) {
      const { monthlyTarget, rent } = configData;
      if (!monthlyTarget || !rent) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
      }
      const config = await db.monthlyConfig.upsert({
        where: { month },
        update: { monthlyTarget, rent },
        create: { month, monthlyTarget, rent },
      });
      return NextResponse.json(config, { status: 201 });
    }

    // Si no, guardar configuración global
    await db.config.deleteMany({});
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
