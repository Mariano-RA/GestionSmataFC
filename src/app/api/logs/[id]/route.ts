import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { validateRequestAuth } from '@/lib/auth';

// GET /api/logs/[id] - Obtener un log específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validar JWT
    const auth = validateRequestAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { id } = await params;
    const logId = parseInt(id);

    if (isNaN(logId)) {
      return NextResponse.json(
        { error: 'ID de log inválido' },
        { status: 400 }
      );
    }

    const log = await prisma.auditLog.findUnique({
      where: { id: logId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!log) {
      return NextResponse.json(
        { error: 'Log no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(log);
  } catch (error) {
    console.error('Error fetching log:', error);
    return NextResponse.json(
      { error: 'Error al obtener el log' },
      { status: 500 }
    );
  }
}
