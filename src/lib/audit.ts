import { db } from './db';
import { Prisma } from '@prisma/client';

export interface CreateAuditLogParams {
  teamId?: number;
  userId?: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  entityId?: number;
  description: string;
  metadata?: unknown;
  ipAddress?: string;
}

/**
 * Crea un log de auditoría
 * @param params Parámetros del log
 * @returns El log creado
 */
export async function createAuditLog(params: CreateAuditLogParams) {
  const {
    teamId,
    userId,
    action,
    entity,
    entityId,
    description,
    metadata,
    ipAddress,
  } = params;

  return await db.auditLog.create({
    data: {
      teamId: teamId || null,
      userId: userId || null,
      action,
      entity,
      entityId: entityId || null,
      description,
      metadata: metadata ? JSON.stringify(metadata) : null,
      ipAddress: ipAddress || null,
    },
  });
}

/**
 * Obtiene logs filtrados con paginación
 */
export async function getAuditLogs({
  teamId,
  userId,
  entity,
  action,
  limit = 100,
  offset = 0,
}: {
  teamId?: number;
  userId?: number;
  entity?: string;
  action?: string;
  limit?: number;
  offset?: number;
}) {
  const where: Prisma.AuditLogWhereInput = {};
  
  if (teamId) where.teamId = teamId;
  if (userId) where.userId = userId;
  if (entity) where.entity = entity;
  if (action) where.action = action;

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
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
      take: limit,
      skip: offset,
    }),
    db.auditLog.count({ where }),
  ]);

  return { logs, total, limit, offset };
}

/**
 * Obtiene la IP del request (útil para logs)
 */
export function getClientIp(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp.trim();
  }
  
  return undefined;
}

/**
 * Formatea metadatos para comparación antes/después
 */
export function formatBeforeAfter(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
) {
  return {
    before,
    after,
    changes: getChanges(before, after),
  };
}

/**
 * Obtiene los campos que cambiaron
 */
function getChanges(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  
  const allKeys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);
  
  allKeys.forEach((key) => {
    const beforeValue = before?.[key];
    const afterValue = after?.[key];

    if (beforeValue !== afterValue) {
      changes[key] = {
        from: beforeValue,
        to: afterValue,
      };
    }
  });
  
  return changes;
}
