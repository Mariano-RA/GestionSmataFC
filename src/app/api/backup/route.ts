import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';

/**
 * GET /api/backup
 * 
 * Endpoint para verificar el estado de backups
 * Protegido por token de autenticación
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar token de seguridad
    const authHeader = request.headers.get('authorization');
    const backupToken = process.env.BACKUP_TOKEN;

    if (!backupToken || authHeader !== `Bearer ${backupToken}`) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener estadísticas de la base de datos
    const [
      userCount,
      teamCount,
      participantCount,
      paymentCount,
      auditLogCount,
    ] = await Promise.all([
      db.user.count(),
      db.team.count(),
      db.participant.count(),
      db.payment.count(),
      db.auditLog.count(),
    ]);

    const stats = {
      timestamp: new Date().toISOString(),
      database: {
        users: userCount,
        teams: teamCount,
        participants: participantCount,
        payments: paymentCount,
        auditLogs: auditLogCount,
      },
    };

    logger.log('Backup status check completed', stats);

    return NextResponse.json({
      success: true,
      message: 'Database is healthy',
      stats,
    });
  } catch (error) {
    logger.error('Backup status check failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check database status',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/backup
 * 
 * Endpoint para triggear un backup manual
 * Protegido por token de autenticación
 * 
 * Nota: En Vercel con Neon, los backups se manejan a nivel de Neon.
 * Este endpoint registra la solicitud de backup en los logs.
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar token de seguridad
    const authHeader = request.headers.get('authorization');
    const backupToken = process.env.BACKUP_TOKEN;

    if (!backupToken || authHeader !== `Bearer ${backupToken}`) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const timestamp = new Date().toISOString();

    // Registrar en audit log
    await db.auditLog.create({
      data: {
        action: 'CREATE',
        entity: 'Backup',
        description: 'Solicitud de backup manual',
        metadata: JSON.stringify({
          timestamp,
          source: 'api',
          ip: request.headers.get('x-forwarded-for'),
        }),
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
      },
    });

    logger.log('Manual backup requested', { timestamp });

    return NextResponse.json({
      success: true,
      message: 'Backup request logged. For Neon databases, use Neon dashboard for backups.',
      timestamp,
      instructions: {
        neon: 'https://console.neon.tech - Navigate to your project > Backups',
        manual: 'Run: node scripts/backup-db.ps1 (Windows) or bash scripts/backup-db.sh (Linux/Mac)',
      },
    });
  } catch (error) {
    logger.error('Manual backup request failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process backup request',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
