export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { validateProtectedTeamRouteWithMethod } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';
import { getFirstSaturdayStartLocal, addMonths } from '@/lib/utils';

const QuerySchema = z.object({
  teamId: z.coerce.number().int().positive(),
  fromMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  toMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

const BodySchema = z.object({
  teamId: z.coerce.number().int().positive(),
  fromMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  toMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  fixInconsistent: z.coerce.boolean().optional().default(false),
});

function listMonths(fromMonth: string, toMonth: string): string[] {
  const out: string[] = [];
  let cur = fromMonth;
  while (cur <= toMonth) {
    out.push(cur);
    cur = addMonths(cur, 1);
  }
  return out;
}

function shouldZeroRequiredByJoinRule(participantJoinDate: string, month: string): boolean {
  const joinMonth = participantJoinDate.slice(0, 7);
  if (month < joinMonth) return true;
  if (month > joinMonth) return false;
  const joinAt = new Date(participantJoinDate);
  const cutoff = getFirstSaturdayStartLocal(month);
  return joinAt.getTime() >= cutoff.getTime();
}

/**
 * GET /api/debt-audit?teamId=1&fromMonth=YYYY-MM&toMonth=YYYY-MM
 * Lista meses que deberían tener required=0 por regla de alta (joinDate + primer sábado 00:00)
 * y detecta snapshots faltantes o inconsistentes.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    teamId: searchParams.get('teamId'),
    fromMonth: searchParams.get('fromMonth') ?? undefined,
    toMonth: searchParams.get('toMonth') ?? undefined,
  });
  if (!parsed.success) return ApiResponse.fromZodError(parsed.error);

  const { teamId, fromMonth, toMonth } = parsed.data;
  const auth = await validateProtectedTeamRouteWithMethod(request, db, teamId, 'GET');
  if (!auth.authorized) return ApiResponse.unauthorized(auth.error);

  const [participants, monthlyStatuses] = await Promise.all([
    db.participant.findMany({
      where: { teamId },
      select: { id: true, name: true, joinDate: true, active: true, status: true },
      orderBy: { joinDate: 'asc' },
    }),
    db.participantMonthlyStatus.findMany({
      where: { teamId },
      select: { participantId: true, month: true, active: true, status: true },
    }),
  ]);

  const minMonth =
    fromMonth ??
    participants.reduce<string | null>((min, p) => {
      const m = p.joinDate.toISOString().slice(0, 7);
      if (min == null) return m;
      return m < min ? m : min;
    }, null) ??
    new Date().toISOString().slice(0, 7);
  const maxMonth = toMonth ?? new Date().toISOString().slice(0, 7);

  const months = listMonths(minMonth, maxMonth);
  const statusMap = new Map<string, { active: boolean; status: string | null }>();
  for (const s of monthlyStatuses) {
    statusMap.set(`${s.participantId}:${s.month}`, { active: s.active, status: s.status ?? null });
  }

  const rows = participants.map((p) => {
    const joinMonth = p.joinDate.toISOString().slice(0, 7);
    const zeroMonths = months.filter((m) => shouldZeroRequiredByJoinRule(p.joinDate.toISOString(), m));
    const missingSnapshots = zeroMonths.filter((m) => !statusMap.has(`${p.id}:${m}`));
    const inconsistentSnapshots = zeroMonths
      .map((m) => {
        const snap = statusMap.get(`${p.id}:${m}`);
        if (!snap) return null;
        if (snap.active === false) return null;
        return { month: m, active: snap.active, status: snap.status };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);

    return {
      participantId: p.id,
      name: p.name,
      joinDate: p.joinDate.toISOString(),
      joinMonth,
      zeroMonths,
      missingSnapshots,
      inconsistentSnapshots,
    };
  });

  const affected = rows.filter((r) => r.missingSnapshots.length > 0 || r.inconsistentSnapshots.length > 0);

  return ApiResponse.ok({
    teamId,
    fromMonth: minMonth,
    toMonth: maxMonth,
    affectedCount: affected.length,
    rows: affected,
    /** Todos los jugadores del equipo (misma forma que rows); permite editar joinDate aunque affectedCount sea 0 */
    allRows: rows,
  });
}

/**
 * POST /api/debt-audit
 * Backfill: crea ParticipantMonthlyStatus faltantes (solo faltantes) marcando active=false
 * para meses que deben tener required=0 por regla de alta.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return ApiResponse.fromZodError(parsed.error);

  const { teamId, fromMonth, toMonth, fixInconsistent } = parsed.data;
  const auth = await validateProtectedTeamRouteWithMethod(request, db, teamId, 'POST');
  if (!auth.authorized) return ApiResponse.unauthorized(auth.error);

  const [participants, monthlyStatuses] = await Promise.all([
    db.participant.findMany({
      where: { teamId },
      select: { id: true, joinDate: true },
    }),
    db.participantMonthlyStatus.findMany({
      where: { teamId },
      select: { id: true, participantId: true, month: true, active: true },
    }),
  ]);

  const existing = new Set(monthlyStatuses.map((s) => `${s.participantId}:${s.month}`));
  const joinDateByParticipantId = new Map<number, string>(
    participants.map((p) => [p.id, p.joinDate.toISOString()])
  );
  const minMonth =
    fromMonth ??
    participants.reduce<string | null>((min, p) => {
      const m = p.joinDate.toISOString().slice(0, 7);
      if (min == null) return m;
      return m < min ? m : min;
    }, null) ??
    new Date().toISOString().slice(0, 7);
  const maxMonth = toMonth ?? new Date().toISOString().slice(0, 7);
  const months = listMonths(minMonth, maxMonth);

  const toCreate: { teamId: number; participantId: number; month: string; active: boolean; status: string }[] = [];
  for (const p of participants) {
    const joinIso = p.joinDate.toISOString();
    for (const m of months) {
      if (!shouldZeroRequiredByJoinRule(joinIso, m)) continue;
      const key = `${p.id}:${m}`;
      if (existing.has(key)) continue;
      toCreate.push({ teamId, participantId: p.id, month: m, active: false, status: 'activo' });
    }
  }

  const created = toCreate.length
    ? await db.participantMonthlyStatus.createMany({
        data: toCreate,
        skipDuplicates: true,
      })
    : { count: 0 };

  let updated = 0;
  if (fixInconsistent) {
    const idsToDisable: number[] = [];
    for (const s of monthlyStatuses) {
      if (s.active === false) continue;
      if (!months.includes(s.month)) continue;
      const joinIso = joinDateByParticipantId.get(s.participantId);
      if (!joinIso) continue;
      if (!shouldZeroRequiredByJoinRule(joinIso, s.month)) continue;
      idsToDisable.push(s.id);
    }
    if (idsToDisable.length) {
      const res = await db.participantMonthlyStatus.updateMany({
        where: { id: { in: idsToDisable } },
        data: { active: false },
      });
      updated = res.count;
    }
  }

  return ApiResponse.ok({ created: created.count, updated });
}

