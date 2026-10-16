import { client } from './client';
import type { DashboardKpis, ReporteCostosResponse } from '@libredss/shared';

export interface FiltrosReporteCostos {
  productoId?: string;
  dias?: number;
}

/** Endpoints del dashboard ejecutivo: KPIs y reporte comparativo de costos (HU-26, HU-27). */
export const dashboardApi = {
  /** KPIs operativos y ahorro estimado acumulado (HU-26). */
  obtenerKpis: () => client.get<DashboardKpis>('/dashboard/kpis'),

  /** Reporte comparativo de costos política empírica vs DSS (HU-27). */
  obtenerReporteCostos: (filtros: FiltrosReporteCostos = {}, signal?: AbortSignal) =>
    client.get<ReporteCostosResponse>('/dashboard/reporte-costos', {
      params: filtros as Record<string, string | number | boolean | undefined>,
      signal,
    }),
};
