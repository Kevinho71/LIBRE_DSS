import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productosApi } from '@/api/productos.api';
import type {
  FiltrosProductos,
  ImportarCsvResponse,
  Paginated,
  ProductoDto,
  ProductoInputDTO,
  ProductoListItemDto,
} from '@libredss/shared';

/** Clave raíz del catálogo (listado y autocompletado) para invalidar tras mutaciones. */
export const PRODUCTOS_QUERY_KEY = ['productos'] as const;

/** Listado paginado de productos con semáforo ABC y estado de alerta (HU-09). */
export function useProductos(filtros: FiltrosProductos) {
  return useQuery<Paginated<ProductoListItemDto>>({
    queryKey: ['productos', 'listado', filtros],
    queryFn: ({ signal }) => productosApi.listar(filtros, signal),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
  });
}

function useInvalidarCatalogo() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: PRODUCTOS_QUERY_KEY });
  };
}

/** Alta de producto con parámetros logísticos (HU-06). */
export function useCrearProducto() {
  const invalidar = useInvalidarCatalogo();
  return useMutation<ProductoDto, unknown, ProductoInputDTO>({
    mutationFn: (dto) => productosApi.crear(dto),
    onSuccess: invalidar,
  });
}

/** Edición de producto existente (HU-07). */
export function useActualizarProducto() {
  const invalidar = useInvalidarCatalogo();
  return useMutation<ProductoDto, unknown, { id: string; dto: ProductoInputDTO }>({
    mutationFn: ({ id, dto }) => productosApi.actualizar(id, dto),
    onSuccess: invalidar,
  });
}

/** Desactivación lógica de producto (HU-07). */
export function useDesactivarProducto() {
  const invalidar = useInvalidarCatalogo();
  return useMutation<void, unknown, string>({
    mutationFn: (id) => productosApi.desactivar(id),
    onSuccess: invalidar,
  });
}

/** Importación masiva de catálogo desde CSV (HU-10). */
export function useImportarCsv() {
  const invalidar = useInvalidarCatalogo();
  return useMutation<ImportarCsvResponse, unknown, string>({
    mutationFn: (contenido) => productosApi.importarCsv(contenido),
    onSuccess: invalidar,
  });
}
