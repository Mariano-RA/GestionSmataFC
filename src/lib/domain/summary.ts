import type { Participant, Payment, Expense, AppConfig } from '@/types';

export interface MonthlySummary {
  collected: number;
  recordedExpenses: number;
  includedExpensesForShare: number;
  baseObjective: number;
  monthlyObjective: number;
  totalCosts: number;
  profit: number;
  totalDebt: number;
  progress: number;
  monthPayments: Payment[];
  monthExpenses: Expense[];
}

/**
 * Calcula el resumen financiero de un mes (recaudado, gastos, ganancia, deuda total, progreso).
 */
export function computeMonthlySummary(
  participants: Participant[],
  payments: Payment[],
  expenses: Expense[],
  currentMonth: string,
  config: AppConfig,
  getRequiredAmount: (p: Participant) => number
): MonthlySummary {
  const monthPayments = payments.filter(p => p.date.startsWith(currentMonth));
  const monthExpenses = expenses.filter(e => e.date.startsWith(currentMonth));

  const collected = monthPayments.reduce((sum, p) => sum + p.amount, 0);
  const recordedExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const includedExpensesForShare = monthExpenses
    .filter((e) => Boolean(e.includeInMonthlyShare))
    .reduce((sum, e) => sum + e.amount, 0);
  const baseObjective = (config.monthlyTarget || 0) + (config.fieldRental || 0);
  const monthlyObjective = baseObjective + includedExpensesForShare;
  const totalCosts = recordedExpenses + baseObjective;
  const profit = collected - totalCosts;
  const progress = monthlyObjective > 0 ? (collected / monthlyObjective) * 100 : 0;

  const totalDebt = participants
    .filter(p => p.active)
    .reduce((sum, p) => {
      const paid = monthPayments
        .filter(pay => pay.participantId === p.id)
        .reduce((s, pay) => s + pay.amount, 0);
      return sum + Math.max(0, getRequiredAmount(p) - paid);
    }, 0);

  return {
    collected,
    recordedExpenses,
    includedExpensesForShare,
    baseObjective,
    monthlyObjective,
    totalCosts,
    profit,
    totalDebt,
    progress,
    monthPayments,
    monthExpenses,
  };
}

/**
 * Resumen mínimo por mes para comparativas (recaudado, gastos, ganancia).
 */
export function computeMonthComparison(
  payments: Payment[],
  expenses: Expense[],
  month: string
): { collected: number; totalExpenses: number; profit: number; paymentCount: number; expenseCount: number } {
  const monthPayments = payments.filter(p => p.date.startsWith(month));
  const monthExpenses = expenses.filter(e => e.date.startsWith(month));
  const collected = monthPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const profit = Math.max(0, collected - totalExpenses);
  return {
    collected,
    totalExpenses,
    profit,
    paymentCount: monthPayments.length,
    expenseCount: monthExpenses.length,
  };
}

/**
 * Primer mes con actividad registrada (pagos, gastos o cierre/config mensual).
 * Si no hay ninguno, devuelve `currentMonth` para no inventar meses previos con cuotas.
 */
export function deriveOperationalStartMonth(
  currentMonth: string,
  payments: { date: string }[],
  expenses: { date: string }[],
  monthlyConfigs: { month: string }[]
): string {
  const months: string[] = [];
  for (const p of payments) months.push(p.date.slice(0, 7));
  for (const e of expenses) months.push(e.date.slice(0, 7));
  for (const c of monthlyConfigs) months.push(c.month);
  if (months.length === 0) return currentMonth;
  return months.reduce((min, m) => (m < min ? m : min), months[0]);
}

/**
 * Métricas de Análisis alineadas al dashboard: costos = gastos registrados + objetivo base + alquiler del mes.
 */
export function computeMonthAnalysisMetrics(
  payments: Payment[],
  expenses: Expense[],
  month: string,
  getBaseObjectiveForMonth: (month: string) => number,
  operationalStartMonth: string
): {
  collected: number;
  recordedExpenses: number;
  baseCosts: number;
  totalCosts: number;
  profit: number;
  paymentCount: number;
  expenseCount: number;
} {
  if (month < operationalStartMonth) {
    return {
      collected: 0,
      recordedExpenses: 0,
      baseCosts: 0,
      totalCosts: 0,
      profit: 0,
      paymentCount: 0,
      expenseCount: 0,
    };
  }

  const monthPayments = payments.filter(p => p.date.startsWith(month));
  const monthExpenses = expenses.filter(e => e.date.startsWith(month));
  const collected = monthPayments.reduce((sum, p) => sum + p.amount, 0);
  const recordedExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const baseCosts = getBaseObjectiveForMonth(month);
  const totalCosts = recordedExpenses + baseCosts;
  const profit = collected - totalCosts;

  return {
    collected,
    recordedExpenses,
    baseCosts,
    totalCosts,
    profit,
    paymentCount: monthPayments.length,
    expenseCount: monthExpenses.length,
  };
}

export interface DashboardCsvRow {
  type: 'payment' | 'expense' | 'summary';
  data: string[];
}

/**
 * Genera las líneas de contenido CSV para exportar el resumen del dashboard.
 * Incluye cabeceras, pagos, gastos y resumen.
 */
export function buildDashboardCsvLines(
  monthLabel: string,
  monthPayments: Payment[],
  monthExpenses: Expense[],
  summary: MonthlySummary,
  getParticipantName: (participantId: number) => string
): string[] {
  const paymentLines = monthPayments
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(p =>
      [p.date, getParticipantName(p.participantId).replace(/;/g, ','), p.amount, p.method ?? '', (p.note ?? '').replace(/;/g, ',')].join(';')
    );
  const expenseLines = monthExpenses
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => [e.date, e.name.replace(/;/g, ','), e.category.replace(/;/g, ','), e.amount].join(';'));

  return [
    `Resumen Financiero - ${monthLabel}`,
    '',
    'PAGOS',
    'Fecha;Participante;Monto;Método;Nota',
    ...paymentLines,
    '',
    'GASTOS',
    'Fecha;Concepto;Categoría;Monto',
    ...expenseLines,
    '',
    'RESUMEN',
    `Recaudado;${summary.collected}`,
    `Gastos registrados;${summary.recordedExpenses}`,
    `Gastos incluidos en cuota;${summary.includedExpensesForShare}`,
    `Objetivo base + Alquiler;${summary.baseObjective}`,
    `Objetivo del mes (incluye gastos);${summary.monthlyObjective}`,
    `Total costos;${summary.totalCosts}`,
    `Ganancia Neta;${summary.profit}`,
  ];
}
