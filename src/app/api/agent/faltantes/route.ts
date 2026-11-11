export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { computeTeamMonth } from '@/lib/domain/teamMonth';
import { buildGroupPaidStatusMessage, buildGroupRemainingToCompleteMessage } from '@/lib/utils/whatsapp';
import { authenticateAgent, errorJson, resolverEquipo } from '@/lib/agent/auth';
import { cargarDatosEquipo, hoyEnCordoba } from '@/lib/agent/datos';

/**
 * GET /api/agent/faltantes?equipo=libre&tipo=faltante|estado
 *
 * Devuelve el mismo texto que los botones de la pantalla de deudores (para pegar en WhatsApp):
 *  - tipo=faltante (por defecto): "Copiar Faltante para Completar" — lo que le falta a cada uno.
 *  - tipo=estado: "Copiar Estado para WhatsApp" — lo que pagó cada uno.
 * Siempre es del mes actual (Córdoba). Solo lectura.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAgent(request);
    if (!auth.ok) return errorJson(auth.status, auth.error);

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo') ?? 'faltante';
    if (tipo !== 'faltante' && tipo !== 'estado') {
      return ApiResponse.badRequest('tipo tiene que ser "faltante" o "estado"');
    }

    const equipo = await resolverEquipo(auth.ctx, searchParams.get('equipo'));
    if (!equipo.ok) return errorJson(equipo.status, equipo.error);

    const { mes } = hoyEnCordoba();
    const cuentas = computeTeamMonth(await cargarDatosEquipo(equipo.team.id, mes));

    const mensaje =
      tipo === 'estado'
        ? buildGroupPaidStatusMessage(cuentas.status, mes, cuentas.monthlyShare)
        : buildGroupRemainingToCompleteMessage(cuentas.status, mes, cuentas.monthlyShare);

    return ApiResponse.ok({
      equipo: equipo.team.name,
      mes,
      tipo,
      cuota: Math.round(cuentas.monthlyShare),
      jugadoresConDeuda: cuentas.status.filter((p) => p.debt > 0).length,
      mensaje,
    });
  } catch (error) {
    logger.error('GET /api/agent/faltantes error', error);
    return ApiResponse.internalError('No se pudo armar el listado');
  }
}
