export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { ApiResponse } from '@/lib/api-response';
import { createAuditLog } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { getClientIp } from '@/lib/auth';
import { computeTeamMonth } from '@/lib/domain/teamMonth';
import { formatCurrency, getMonthName, normalizeName } from '@/lib/utils';
import { authenticateAgent, errorJson, resolverEquipo } from '@/lib/agent/auth';
import { buscarJugadores } from '@/lib/agent/busqueda';
import { cargarDatosEquipo, hoyEnCordoba } from '@/lib/agent/datos';

/**
 * POST /api/agent/pagos — el asistente registra el pago de un jugador.
 *
 * El jugador se busca por nombre dentro del equipo; si hay 0 o más de 1 coincidencia no se carga nada y se
 * devuelve el motivo (para que el asistente le pregunte a Nano). Va al mes actual salvo que se indique `mes`.
 * No hay rutas para editar ni borrar pagos: eso se hace desde la web.
 */

const MAX_INT_POSTGRES = 2_147_483_647;
/** Ventana en la que un pago idéntico se considera un posible doble envío. */
const VENTANA_DUPLICADO_MS = 2 * 60 * 1000;

const cuerpoSchema = z.object({
  jugador: z.string().trim().min(1, 'jugador requerido').max(80),
  monto: z.number('monto debe ser un número').int('monto debe ser un número entero en pesos').positive('monto debe ser mayor a 0').max(MAX_INT_POSTGRES),
  equipo: z.string().trim().max(60).optional(),
  mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'mes inválido (YYYY-MM)').optional(),
  metodo: z.string().trim().max(40).optional(),
  nota: z.string().trim().max(200).optional(),
  confirmarDuplicado: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAgent(request);
    if (!auth.ok) return errorJson(auth.status, auth.error);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return ApiResponse.badRequest('El cuerpo tiene que ser JSON');
    }
    const validacion = cuerpoSchema.safeParse(body);
    if (!validacion.success) return ApiResponse.fromZodError(validacion.error);
    const datos = validacion.data;

    const equipo = await resolverEquipo(auth.ctx, datos.equipo);
    if (!equipo.ok) return errorJson(equipo.status, equipo.error);

    const hoy = hoyEnCordoba();
    const mes = datos.mes ?? hoy.mes;
    const entrada = await cargarDatosEquipo(equipo.team.id, hoy.mes);
    const cuentas = computeTeamMonth(entrada);

    const candidatos = buscarJugadores(entrada.participants, datos.jugador);
    if (candidatos.length === 0) {
      return errorJson(404, `No encontré a "${datos.jugador}" en ${equipo.team.name}. No se cargó nada.`);
    }
    if (candidatos.length > 1) {
      const nombres = candidatos.map((c) => normalizeName(c.name)).join(', ');
      return errorJson(409, `"${datos.jugador}" coincide con varios jugadores de ${equipo.team.name}: ${nombres}. No se cargó nada: indicá cuál.`);
    }
    const jugador = candidatos[0];

    if (cuentas.isMonthClosed(mes)) {
      return errorJson(409, `El mes ${getMonthName(mes)} ${mes.slice(0, 4)} está cerrado: no se cargan pagos ahí. No se cargó nada.`);
    }

    if (!datos.confirmarDuplicado) {
      const desde = new Date(Date.now() - VENTANA_DUPLICADO_MS);
      const repetido = await db.payment.findFirst({
        where: { teamId: equipo.team.id, participantId: jugador.id, amount: datos.monto, recordedAt: { gte: desde } },
        select: { id: true },
      });
      if (repetido) {
        return errorJson(
          409,
          `Ya se cargó un pago igual de ${formatCurrency(datos.monto)} para ${normalizeName(jugador.name)} hace instantes. No se cargó otro. Si es a propósito, repetí con confirmarDuplicado=true.`
        );
      }
    }

    const ip = getClientIp(request) ?? undefined;
    const nota = datos.nota || 'Cargado por el asistente';
    const pago = await db.$transaction(async (tx) => {
      const creado = await tx.payment.create({
        data: {
          teamId: equipo.team.id,
          participantId: jugador.id,
          date: hoy.fecha,
          appliedMonth: mes === hoy.fecha.slice(0, 7) ? null : mes,
          amount: datos.monto,
          method: datos.metodo || null,
          note: nota,
        },
      });
      await createAuditLog(
        {
          teamId: equipo.team.id,
          userId: auth.ctx.userId,
          action: 'CREATE',
          entity: 'Payment',
          entityId: creado.id,
          description: `Pago creado por el asistente: $${datos.monto} para participante ${jugador.id}`,
          metadata: { origen: 'agente', participantId: jugador.id, date: hoy.fecha, appliedMonth: mes, amount: datos.monto, method: datos.metodo ?? null, note: nota },
          ipAddress: ip,
        },
        tx
      );
      return creado;
    });

    // Estado del jugador en ese mes con el pago ya sumado.
    const cuota = Math.round(cuentas.getRequiredAmountForMonth(jugador, mes));
    const pagadoAntes = entrada.payments
      .filter((p) => p.participantId === jugador.id && (p.appliedMonth ?? p.date.slice(0, 7)) === mes)
      .reduce((suma, p) => suma + p.amount, 0);
    const pagado = pagadoAntes + datos.monto;
    const falta = Math.max(0, cuota - pagado);

    const nombre = normalizeName(jugador.name);
    let estado: string;
    if (cuota === 0) estado = `no tiene cuota en ${getMonthName(mes)}`;
    else if (falta === 0) estado = `completó la cuota de ${getMonthName(mes)} (${formatCurrency(cuota)})`;
    else estado = `lleva ${formatCurrency(pagado)} de ${formatCurrency(cuota)} en ${getMonthName(mes)}, le faltan ${formatCurrency(falta)}`;
    const resumen = `Registré ${formatCurrency(datos.monto)} de ${nombre} (${equipo.team.name}): ${estado}.`;

    return ApiResponse.created({
      id: pago.id,
      equipo: equipo.team.name,
      jugador: nombre,
      mes,
      fecha: hoy.fecha,
      monto: datos.monto,
      cuota,
      pagadoEnElMes: pagado,
      falta,
      resumen,
    });
  } catch (error) {
    logger.error('POST /api/agent/pagos error', error);
    return ApiResponse.internalError('No se pudo registrar el pago');
  }
}
