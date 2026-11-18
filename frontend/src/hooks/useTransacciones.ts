import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { transaccionesApi, type FiltrosTransacciones, type TransaccionesPaginadas } from '@/api/transacciones.api';

/** Listado paginado del Kardex con filtros por fecha, tipo, producto y estado (HU-14). */
export function useTransacciones(filtros: FiltrosTransacciones) {
  return useQuery<TransaccionesPaginadas>({
    queryKey: ['transacciones', filtros],
    queryFn: ({ signal }) => transaccionesApi.listar(filtros, signal),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}
