import { db as prisma } from '@/lib/db';
import { validateRequestAuth, validateSuperAdmin } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/stats
 * Super admin only: Obtener estadísticas del sistema
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

    // Obtener recuentos totales
    const [
      totalUsers,
      totalActiveUsers,
      totalTeams,
      totalActiveTeams,
      totalParticipants,
      totalPayments,
      totalExpenses,
      totalAuditLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { active: true } }),
      prisma.team.count(),
      prisma.team.count({ where: { active: true } }),
      prisma.participant.count(),
      prisma.payment.count(),
      prisma.expense.count(),
      prisma.auditLog.count(),
    ]);

    // Estadísticas por equipo
    const teamStats = await prisma.team.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            participants: true,
            payments: true,
            expenses: true,
            userTeams: true,
          },
        },
      },
    });

    // Estadísticas por rol global
    const usersByRole = await prisma.user.groupBy({
      by: ['globalRole'],
      _count: true,
    });

    // Últimas acciones
    const recentActions = await prisma.auditLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true },
        },
        team: {
          select: { name: true },
        },
      },
    });

    // Resumen de cambios por entidad en últimos 7 días
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const actionsByEntity = await prisma.auditLog.groupBy({
      by: ['entity', 'action'],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: true,
    });

    // Usuarios más activos (solo con userId no nulo)
    const mostActiveUsersRaw = await prisma.auditLog.groupBy({
      by: ['userId'],
      _count: true,
      orderBy: { _count: { userId: 'desc' } },
      take: 10, // pedir más por si hay nulls
    });

    const mostActiveUsers = mostActiveUsersRaw.filter(
      (stat): stat is typeof stat & { userId: number } => stat.userId != null
    ).slice(0, 5);

    const activeUsersDetails = await Promise.all(
      mostActiveUsers.map(async (stat) => {
        const user = await prisma.user.findUnique({
          where: { id: stat.userId },
          select: { name: true, email: true },
        });
        return {
          userId: stat.userId,
          user: user ?? { name: 'Unknown', email: 'unknown' },
          actionCount: stat._count,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalUsers,
          totalActiveUsers,
          inactiveUsers: totalUsers - totalActiveUsers,
          totalTeams,
          totalActiveTeams,
          inactiveTeams: totalTeams - totalActiveTeams,
          totalParticipants,
          totalPayments,
          totalExpenses,
          totalAuditLogs,
        },
        usersByRole: usersByRole.reduce(
          (acc: any, role: any) => ({
            ...acc,
            [role.globalRole]: role._count,
          }),
          {}
        ),
        teamStats,
        recentActions: recentActions.map((log: any) => ({
          id: log.id,
          action: log.action,
          entity: log.entity,
          description: log.description,
          userName: log.user?.name || 'Unknown',
          userEmail: log.user?.email,
          teamName: log.team?.name,
          createdAt: log.createdAt,
        })),
        actionsByEntity,
        mostActiveUsers: activeUsersDetails,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Error obteniendo estadísticas' },
      { status: 500 }
    );
  }
}
