import { client } from './client';
import type {
  ListadoSistemas,
  PanelAlertas,
  PanelAlertasMinMax,
  ReportePareto,
  ResultadoAsignacionSistemas,
  ResultadoRecalculoAbc,
  ResultadoRecalculoEoqRop,
  ResumenAbc,
} from '@libredss/shared';

/** Endpoints del motor DSS: ABC (HU-17/18), EOQ/ROP (HU-19 a 22) y sistemas P/Q (HU-23/38/39). */
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

  /** Política P/Q asignada y fase de arranque en frío por producto (HU-23, HU-39). */
  obtenerSistemas: () => client.get<ListadoSistemas>('/dss/sistemas'),

  /** Recalcula la asignación de sistemas P/Q y la fase de arranque (HU-23, HU-39). */
  recalcularSistemas: () => client.post<ResultadoAsignacionSistemas>('/dss/sistemas/recalcular'),

  /** Alertas por umbral Min/Max de productos en arranque en frío (HU-38). */
  obtenerAlertasMinMax: () => client.get<PanelAlertasMinMax>('/dss/alertas-min-max'),
};

