import { db } from './db';
import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

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

/** Cliente Prisma (db o tx dentro de $transaction) para escribir el log */
type PrismaClientLike = Pick<PrismaClient, 'auditLog'>;

/**
 * Crea un log de auditoría. Puede usarse dentro de una transacción pasando el cliente tx.
 * @param params Parámetros del log
 * @param tx Cliente de transacción opcional (si se llama desde db.$transaction)
 * @returns El log creado
 */
export async function createAuditLog(params: CreateAuditLogParams, tx?: PrismaClientLike) {
  const client = (tx ?? db) as PrismaClient;
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

  return await client.auditLog.create({
    data: {
      teamId: teamId ?? null,
      userId: userId ?? null,
      action,
      entity,
      entityId: entityId ?? null,
      description,
      metadata: metadata != null ? JSON.stringify(metadata) : null,
      ipAddress: ipAddress ?? null,
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

/** Reexportar getClientIp desde auth para no duplicar lógica (audit lo usa en login/logout) */
export { getClientIp } from './auth';

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
