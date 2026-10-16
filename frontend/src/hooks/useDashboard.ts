import { useQuery } from '@tanstack/react-query';
import { dashboardApi, type FiltrosReporteCostos } from '@/api/dashboard.api';
import type { DashboardKpis, ReporteCostosResponse } from '@libredss/shared';

/** KPIs operativos del dashboard ejecutivo (HU-26). */
export function useDashboardKpis() {
  return useQuery<DashboardKpis>({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => dashboardApi.obtenerKpis(),
    staleTime: 30_000,
  });
}

/** Reporte comparativo de costos política empírica vs DSS (HU-27). */
export function useReporteCostos(filtros: FiltrosReporteCostos) {
  return useQuery<ReporteCostosResponse>({
    queryKey: ['dashboard', 'reporte-costos', filtros],
    queryFn: ({ signal }) => dashboardApi.obtenerReporteCostos(filtros, signal),
    staleTime: 60_000,
    retry: 0,
  });
}
