import { createHash, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { canEditTeamData, type GlobalRole, type TeamRole } from '@/lib/permissions';
import { buscarPorNombre } from './busqueda';

/**
 * Autenticación de las rutas /api/agent/... (las usa Hermes, no el navegador).
 *
 *  - Todo se configura por variables de entorno. Si falta algo, todo queda cerrado (503).
 *  - El agente actúa siempre como UN usuario (AGENT_USER_ID) y solo en los equipos donde ese usuario puede editar.
 *  - El equipo lo elige el pedido por nombre; si no lo indica se usa AGENT_DEFAULT_TEAM_ID.
 *  - Clave larga (x-agent-key), comparada en tiempo constante, y límite de pedidos por hora (en memoria).
 */

export const AGENT_KEY_MIN_LENGTH = 32;
const DEFAULT_MAX_REQUESTS_PER_HOUR = 120;

export interface AgentContext {
  userId: number;
  defaultTeamId: number | null;
}

export type AgentAuthResult =
  | { ok: true; ctx: AgentContext }
  | { ok: false; status: 401 | 429 | 503; error: string };

export type EquipoResult =
  | { ok: true; team: { id: number; name: string } }
  | { ok: false; status: 404 | 409; error: string };

export function errorJson(status: number, error: string) {
  return NextResponse.json(
    { success: false, error, status, timestamp: new Date().toISOString() },
    { status }
  );
}

function parsePositiveInt(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value.trim())) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function sha256(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

const hits: number[] = [];

/** Ventana deslizante de una hora. Devuelve false si se superó el límite. */
export function consumeRateLimit(limit: number, now: number = Date.now()): boolean {
  const windowStart = now - 3_600_000;
  while (hits.length > 0 && hits[0] <= windowStart) hits.shift();
  if (hits.length >= limit) return false;
  hits.push(now);
  return true;
}

export function resetRateLimit(): void {
  hits.length = 0;
}

export async function authenticateAgent(
  request: Request,
  env: NodeJS.ProcessEnv = process.env
): Promise<AgentAuthResult> {
  const expectedKey = env.AGENT_API_KEY ?? '';
  const userId = parsePositiveInt(env.AGENT_USER_ID);

  if (expectedKey.length < AGENT_KEY_MIN_LENGTH || !userId) {
    console.error('Rutas /api/agent cerradas: faltan AGENT_API_KEY (mínimo 32 caracteres) o AGENT_USER_ID.');
    return { ok: false, status: 503, error: 'Rutas del agente no configuradas' };
  }

  // Se cuenta todo intento (también los fallidos) para frenar fuerza bruta.
  const limit = parsePositiveInt(env.AGENT_MAX_REQUESTS_PER_HOUR) ?? DEFAULT_MAX_REQUESTS_PER_HOUR;
  if (!consumeRateLimit(limit)) {
    return { ok: false, status: 429, error: 'Demasiados pedidos del agente. Probá más tarde.' };
  }

  const provided = request.headers.get('x-agent-key') ?? '';
  const keyOk = provided.length > 0 && timingSafeEqual(sha256(provided), sha256(expectedKey));
  if (!keyOk) {
    console.warn('Pedido /api/agent rechazado: clave inválida.');
    return { ok: false, status: 401, error: 'Clave inválida' };
  }

  const user = await db.user.findFirst({ where: { id: userId, active: true }, select: { id: true } });
  if (!user) {
    console.error('AGENT_USER_ID no es un usuario activo.');
    return { ok: false, status: 503, error: 'Configuración del agente inválida' };
  }

  return { ok: true, ctx: { userId, defaultTeamId: parsePositiveInt(env.AGENT_DEFAULT_TEAM_ID) } };
}

/**
 * Elige el equipo del pedido entre los que el usuario del agente puede editar.
 * `consulta` puede ser el nombre (o parte: "libre", "+30") o el id. Sin consulta usa el equipo por defecto.
 */
export async function resolverEquipo(ctx: AgentContext, consulta?: string | null): Promise<EquipoResult> {
  const filas = await db.userTeam.findMany({
    where: { userId: ctx.userId, user: { active: true }, team: { active: true } },
    select: { role: true, team: { select: { id: true, name: true } }, user: { select: { globalRole: true } } },
  });
  const equipos = filas
    .filter((f) => canEditTeamData((f.user.globalRole || 'user') as GlobalRole, (f.role || 'viewer') as TeamRole))
    .map((f) => f.team);

  const nombres = equipos.map((e) => e.name).join(', ') || 'ninguno';
  const texto = consulta?.trim();

  if (!texto) {
    const porDefecto = equipos.find((e) => e.id === ctx.defaultTeamId);
    if (porDefecto) return { ok: true, team: porDefecto };
    return { ok: false, status: 409, error: `Indicá el equipo. Disponibles: ${nombres}.` };
  }

  if (/^\d+$/.test(texto)) {
    const porId = equipos.find((e) => e.id === Number(texto));
    if (porId) return { ok: true, team: porId };
  }

  const candidatos = buscarPorNombre(equipos, texto);
  if (candidatos.length === 1) return { ok: true, team: candidatos[0] };
  if (candidatos.length === 0) {
    return { ok: false, status: 404, error: `No encontré el equipo "${texto}". Disponibles: ${nombres}.` };
  }
  return {
    ok: false,
    status: 409,
    error: `"${texto}" coincide con varios equipos: ${candidatos.map((e) => e.name).join(', ')}. Indicá cuál.`,
  };
}
