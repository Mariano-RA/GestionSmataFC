import { db as prisma } from '@/lib/db';
import { validateRequestAuth, validateSuperAdmin } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/teams
 * Super admin only: Listar todos los equipos con estadísticas
 */
export async function GET(request: NextRequest) {
  try {
    // Validar JWT
    const auth = validateRequestAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const userId = auth.userId;

    // Validar que sea super admin
    const isSuperAdmin = await validateSuperAdmin(prisma, userId);

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            participants: true,
            payments: true,
            expenses: true,
            userTeams: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: teams,
      total: teams.length,
    });
  } catch (error) {
    console.error('Error listing teams:', error);
    return NextResponse.json(
      { error: 'Error listando equipos' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/teams
 * Super admin only: Crear nuevo equipo
 */
export async function POST(request: NextRequest) {
  try {
    const auth = validateRequestAuth(request);

    if (!auth.authorized) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const userId = auth.userId;
    const isSuperAdmin = await validateSuperAdmin(prisma, userId);

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Nombre del equipo requerido' },
        { status: 400 }
      );
    }

    const newTeam = await prisma.team.create({
      data: {
        name,
        description: description || '',
        active: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        active: true,
        createdAt: true,
      },
    });

    // Auditar
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entity: 'Team',
        entityId: newTeam.id,
        description: `Equipo creado: ${name}`,
        metadata: JSON.stringify({ name, description }),
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: newTeam,
      message: 'Equipo creado exitosamente',
    });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json(
      { error: 'Error creando equipo' },
      { status: 500 }
    );
  }
}
