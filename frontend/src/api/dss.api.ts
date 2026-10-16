import { client } from './client';
import type {
  PanelAlertas,
  ReportePareto,
  ResultadoRecalculoAbc,
  ResultadoRecalculoEoqRop,
  ResumenAbc,
} from '@libredss/shared';

/** Endpoints del motor DSS: clasificación ABC (HU-17/HU-18) y EOQ/ROP (HU-19 a HU-22). */
export const dssApi = {
  /** Distribución de valor acumulado por clase A/B/C (HU-18). */
  obtenerResumenAbc: () => client.get<ResumenAbc>('/dss/abc/resumen'),

  /** Curva de Pareto con valor de consumo y % acumulado por producto (HU-18). */
  obtenerPareto: () => client.get<ReportePareto>('/dss/abc/pareto'),

  /** Recalcula la clasificación ABC a partir del historial de demanda (HU-16). */
  recalcularAbc: () => client.post<ResultadoRecalculoAbc>('/dss/abc/recalcular'),

  /** Panel de alertas de reabastecimiento priorizadas por criticidad ABC (HU-22). */
  obtenerAlertas: () => client.get<PanelAlertas>('/dss/alertas'),

  /** Recalcula EOQ y ROP/SS por producto para refrescar las alertas (HU-19, HU-20). */
  recalcularEoqRop: () => client.post<ResultadoRecalculoEoqRop>('/dss/eoq-rop/recalcular'),
};
