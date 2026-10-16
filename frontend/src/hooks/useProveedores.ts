import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { proveedoresApi } from '@/api/proveedores.api';
import type {
  AsociarProductoProveedorDTO,
  CrearProveedorDTO,
  ProductoProveedorDto,
  ProveedorDto,
} from '@libredss/shared';

export const PROVEEDORES_QUERY_KEY = ['proveedores'] as const;

/** Listado completo de proveedores de la empresa (HU-08). */
export function useProveedores() {
  return useQuery<ProveedorDto[]>({
    queryKey: PROVEEDORES_QUERY_KEY,
    queryFn: () => proveedoresApi.listar(),
    staleTime: 60_000,
  });
}

/** Alta de proveedor (HU-08). */
export function useCrearProveedor() {
  const queryClient = useQueryClient();
  return useMutation<ProveedorDto, unknown, CrearProveedorDTO>({
    mutationFn: (dto) => proveedoresApi.crear(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROVEEDORES_QUERY_KEY });
    },
  });
}

/** Vínculos producto↔proveedor de un producto (HU-08, CB-02). */
export function useProveedoresDeProducto(productoId: string | null) {
  return useQuery<ProductoProveedorDto[]>({
    queryKey: ['productos', productoId, 'proveedores'],
    queryFn: () => proveedoresApi.listarDeProducto(productoId as string),
    enabled: Boolean(productoId),
    staleTime: 30_000,
  });
}

/** Asocia (o actualiza) un proveedor a un producto (HU-08, CB-02). */
export function useAsociarProveedor(productoId: string | null) {
  const queryClient = useQueryClient();
  return useMutation<ProductoProveedorDto, unknown, AsociarProductoProveedorDTO>({
    mutationFn: (dto) => proveedoresApi.asociar(productoId as string, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['productos', productoId, 'proveedores'] });
      void queryClient.invalidateQueries({ queryKey: PROVEEDORES_QUERY_KEY });
    },
  });
}
