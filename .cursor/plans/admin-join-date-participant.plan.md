---
name: Fecha de alta desde administración
overview: Sustituir el enfoque del checkbox mensual por permitir corregir la fecha de alta (joinDate) del jugador. Así la regla automática del primer sábado usa una fecha coherente sin tocar ParticipantMonthlyStatus.
todos:
  - id: schema-api-join-date
    content: Añadir joinDate opcional a updateParticipantSchema (Zod ISO datetime) y aplicar en PATCH /api/participants/[id] con auditoría
    status: completed
  - id: ui-admin-dashboard
    content: En AdminDashboard (auditoría deuda por alta), permitir editar fecha de alta por fila y llamar PATCH con teamId correcto
    status: completed
  - id: ui-participants-optional
    content: Opcional — mismo campo fecha de alta en modal Participantes para admins de equipo sin pasar por panel global
    status: completed
isProject: false
---

# Editar fecha de alta (`joinDate`) desde administración

## Cambio de enfoque respecto al plan anterior

No implementamos el checkbox de cuota mensual ni escrituras extra en `ParticipantMonthlyStatus`. En su lugar, la **fecha de alta** del modelo `[Participant](prisma/schema.prisma)` es la que alimenta la regla en `[getRequiredAmountForMonth](src/hooks/useTeamData.ts)` (mes de alta + primer sábado). Corregir `joinDate` (por ejemplo a una fecha **anterior al primer sábado** del mes en que debían empezar a pagar, o al mes anterior) alinea el comportamiento con lo que el equipo considera justo.

## Comportamiento que debe preservarse

- Tras cambiar `joinDate`, conviene **recargar datos** en cliente si hay vistas abiertas (deuda, participantes).
- Los snapshots existentes `ParticipantMonthlyStatus` para meses cerrados **no se recalculan solos**; para meses ya cerrados el histórico puede seguir reflejando el estado anterior. El plan asume que el caso principal es **mes abierto / corrección de alta**. Si hiciera falta consistencia histórica, sería un alcance aparte.

## Backend

1. `**[src/lib/schemas.ts](src/lib/schemas.ts)`**
  - Extender `updateParticipantSchema` con `joinDate` opcional: string ISO8601 (`z.string().datetime()` o regex + coerce desde input tipo `datetime-local` si se normaliza en el handler).
2. `**[src/app/api/participants/[id]/route.ts](src/app/api/participants/[id]/route.ts)**`
  - En `PATCH`, pasar `joinDate` al `update` de Prisma cuando venga en el body validado (convertir a `Date` si Prisma lo espera así).
  - Mantener `validateProtectedTeamRouteWithMethod` y comprobar que el participante pertenece al `teamId` implícito (ya resuelto por participante cargado desde DB).
3. **Auditoría**
  - Incluir en `metadata` del log algo como `joinDateBefore` / `joinDateAfter` para trazabilidad.

## Panel de administración (prioridad según tu mensaje)

**Ubicación natural:** la sección ya existente **«Auditoría de deuda por alta (joinDate)»** en `[src/components/AdminDashboard.tsx](src/components/AdminDashboard.tsx)`, donde cada fila muestra `joinDate` y meses con cuota 0 por regla.

- Añadir control de edición por fila (p. ej. `input type="datetime-local"` o fecha + hora según precisión deseada; el sistema usa hora local para comparar con el primer sábado).
- Al guardar: `PATCH /api/participants/:participantId` con `{ joinDate: ... }`.
- **Importante:** el `[useApi](src/hooks/useApi.ts)` inyecta `teamId` desde `currentTeamId` del usuario. En el panel admin el equipo auditado (`auditTeamId`) puede **no coincidir** con el equipo activo del usuario. Hay que usar `**disableAutoParams: true`** y enviar `**teamId` explícito** igual al equipo de la auditoría (`auditTeamId`), para que la autorización coincida con el equipo del jugador editado.

## Opcional (misma API, otro lugar)

- Campo **fecha de alta** en el modal de `[src/components/Participants.tsx](src/components/Participants.tsx)` para **admin del equipo** (misma ruta PATCH). Evita depender del panel global si siempre gestionás el equipo desde ahí.

## Permisos

- Quien pueda hacer `PATCH` en participantes hoy (**admin de equipo** según `[canEditTeamData](src/lib/permissions.ts)`) podrá cambiar la fecha.
- Si en el futuro se requiere que **solo super_admin** cambie `joinDate` desde rutas `/api/admin/`**, habría que añadir un endpoint admin dedicado con `validateSuperAdmin`; **no es necesario** si el alcance es «admin del equipo desde panel» y ya tenéis acceso PATCH.

## Lo que se deja fuera (este plan)

- Checkbox / upsert de `ParticipantMonthlyStatus` (plan anterior — descartado para esta iteración).
- Migración Prisma: **no** hace falta; `joinDate` ya existe.

