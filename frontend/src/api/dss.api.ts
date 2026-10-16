import { client } from './client';
import type { ReportePareto, ResumenAbc, ResultadoRecalculoAbc } from '@libredss/shared';

/** Endpoints del motor DSS para la clasificación ABC (HU-17 / HU-18). */
export const dssApi = {
  /** Distribución de valor acumulado por clase A/B/C (HU-18). */
  obtenerResumenAbc: () => client.get<ResumenAbc>('/dss/abc/resumen'),

  /** Curva de Pareto con valor de consumo y % acumulado por producto (HU-18). */
  obtenerPareto: () => client.get<ReportePareto>('/dss/abc/pareto'),

  /** Recalcula la clasificación ABC a partir del historial de demanda (HU-16). */
  recalcularAbc: () => client.post<ResultadoRecalculoAbc>('/dss/abc/recalcular'),
};
