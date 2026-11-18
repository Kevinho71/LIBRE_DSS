import { useQuery } from '@tanstack/react-query';
import { dssApi } from '@/api/dss.api';
import type { ReportePareto, ResumenAbc } from '@libredss/shared';

const ABC_STALE_TIME = 60_000;

/** Resumen agregado por clase ABC (HU-18). */
export function useAbcResumen() {
  return useQuery<ResumenAbc>({
    queryKey: ['dss', 'abc', 'resumen'],
    queryFn: () => dssApi.obtenerResumenAbc(),
    staleTime: ABC_STALE_TIME,
  });
}

/** Curva de Pareto por producto con % de valor acumulado (HU-18). */
export function useAbcPareto() {
  return useQuery<ReportePareto>({
    queryKey: ['dss', 'abc', 'pareto'],
    queryFn: () => dssApi.obtenerPareto(),
    staleTime: ABC_STALE_TIME,
  });
}
