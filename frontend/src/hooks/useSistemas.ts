import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dssApi } from '@/api/dss.api';
import { productosApi } from '@/api/productos.api';
import type {
  ListadoSistemas,
  PanelAlertasMinMax,
  ParametrosMinMaxDTO,
  ProductoDto,
  ResultadoAsignacionSistemas,
} from '@libredss/shared';

export const SISTEMAS_QUERY_KEY = ['dss', 'sistemas'] as const;
export const ALERTAS_MINMAX_QUERY_KEY = ['dss', 'alertas-min-max'] as const;

/** Política P/Q y fase de arranque en frío por producto (HU-23, HU-39). */
export function useSistemas() {
  return useQuery<ListadoSistemas>({
    queryKey: SISTEMAS_QUERY_KEY,
    queryFn: () => dssApi.obtenerSistemas(),
    staleTime: 30_000,
  });
}

/** Alertas por umbral Min/Max de productos en arranque en frío (HU-38). */
export function useAlertasMinMax() {
  return useQuery<PanelAlertasMinMax>({
    queryKey: ALERTAS_MINMAX_QUERY_KEY,
    queryFn: () => dssApi.obtenerAlertasMinMax(),
    staleTime: 30_000,
  });
}

/** Recalcula la asignación de sistemas P/Q y la fase de arranque (HU-23, HU-39). */
export function useRecalcularSistemas() {
  const queryClient = useQueryClient();
  return useMutation<ResultadoAsignacionSistemas, unknown, void>({
    mutationFn: () => dssApi.recalcularSistemas(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SISTEMAS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ALERTAS_MINMAX_QUERY_KEY });
    },
  });
}

/** Actualiza los umbrales Min/Max manuales de un producto en arranque en frío (HU-38). */
export function useActualizarMinMax() {
  const queryClient = useQueryClient();
  return useMutation<ProductoDto, unknown, { id: string; dto: ParametrosMinMaxDTO }>({
    mutationFn: ({ id, dto }) => productosApi.actualizarParametros(id, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['productos'] });
      void queryClient.invalidateQueries({ queryKey: SISTEMAS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ALERTAS_MINMAX_QUERY_KEY });
    },
  });
}
