import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dssApi } from '@/api/dss.api';
import type { ExplicacionAlertaResponse, PanelAlertas, ResultadoRecalculoEoqRop } from '@libredss/shared';

const ALERTAS_STALE_TIME = 30_000;

/** Clave raíz de las consultas del motor EOQ/ROP para invalidarlas tras recalcular. */
export const ALERTAS_QUERY_KEY = ['dss', 'alertas'] as const;

/** Panel de alertas de reabastecimiento priorizadas por criticidad ABC (HU-22). */
export function useAlertasReabastecimiento() {
  return useQuery<PanelAlertas>({
    queryKey: ALERTAS_QUERY_KEY,
    queryFn: () => dssApi.obtenerAlertas(),
    staleTime: ALERTAS_STALE_TIME,
  });
}

/** Recalcula EOQ/ROP en el backend e invalida el panel de alertas (HU-19, HU-20). */
export function useRecalcularEoqRop() {
  const queryClient = useQueryClient();
  return useMutation<ResultadoRecalculoEoqRop, unknown, void>({
    mutationFn: () => dssApi.recalcularEoqRop(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ALERTAS_QUERY_KEY });
    },
  });
}

/** Explicación en lenguaje natural de una alerta de reabastecimiento (HU-34). */
export function useExplicarAlerta() {
  return useMutation<ExplicacionAlertaResponse, unknown, string>({
    mutationFn: (productoId) => dssApi.explicarAlerta(productoId),
  });
}
