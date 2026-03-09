import type { RequestFn } from './types';
import type { AppConfig, MonthlyConfig } from '@/types';

export async function getConfig(request: RequestFn): Promise<AppConfig | null> {
  const data = await request<AppConfig>('/api/config');
  return data != null && typeof data === 'object' ? data : null;
}

export async function getConfigForMonth(
  request: RequestFn,
  month: string
): Promise<{ monthlyTarget?: number; fieldRental?: number } | null> {
  return request<{ monthlyTarget?: number; fieldRental?: number }>(`/api/config?month=${month}`);
}

export async function getAllMonthlyConfigs(request: RequestFn): Promise<MonthlyConfig[]> {
  const data = await request<MonthlyConfig[]>('/api/config?allMonths=true');
  return Array.isArray(data) ? data : [];
}

export async function saveConfig(
  request: RequestFn,
  teamId: number,
  newConfig: AppConfig
): Promise<unknown> {
  return request<unknown>(`/api/config?teamId=${teamId}`, {
    method: 'POST',
    body: newConfig as unknown as Record<string, unknown>,
    disableAutoParams: true,
  });
}
