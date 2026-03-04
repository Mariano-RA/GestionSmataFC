import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

// GET /api/logs - Obtener logs de auditoría
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const userId = searchParams.get('userId');
    const entity = searchParams.get('entity');
    const action = searchParams.get('action');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    let where: any = {};

    if (teamId) {
      where.teamId = parseInt(teamId);
    }
    if (userId) {
      where.userId = parseInt(userId);
    }
    if (entity) {
      where.entity = entity;
    }
    if (action) {
      where.action = action;
    }

    const logs = await prisma.auditLog.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : 100,
      skip: offset ? parseInt(offset) : 0,
    });

    // Obtener el total para paginación
    const total = await prisma.auditLog.count({ where });

    return NextResponse.json({
      logs,
      total,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0,
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Error al obtener los logs' },
      { status: 500 }
    );
  }
}

// POST /api/logs - Crear un log de auditoría manual
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      teamId,
      userId,
      action,
      entity,
      entityId,
      description,
      metadata,
      ipAddress,
    } = body;

    if (!action || !entity || !description) {
      return NextResponse.json(
        { error: 'Action, entity y description son requeridos' },
        { status: 400 }
      );
    }

    const log = await prisma.auditLog.create({
      data: {
        teamId: teamId || null,
        userId: userId || null,
        action,
        entity,
        entityId: entityId || null,
        description,
        metadata: metadata || null,
        ipAddress: ipAddress || null,
      },
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

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error('Error creating log:', error);
    return NextResponse.json(
      { error: 'Error al crear el log' },
      { status: 500 }
    );
  }
}
