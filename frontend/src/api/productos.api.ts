import { client } from './client';
import type {
  FiltrosProductos,
  ImportarCsvResponse,
  Paginated,
  ProductoDto,
  ProductoInputDTO,
  ProductoListItemDto,
} from '@libredss/shared';

export interface ProductoBusqueda {
  id: string;
  sku: string | null;
  nombre: string;
  precioVenta: number;
  costoUnitario: number;
  stockActual: number;
  unidadMedida: string;
  factorConversion: number;
  unidadCompra: string | null;
}

export interface BusquedaProductosResponse {
  items: ProductoBusqueda[];
  total: number;
}

/** Endpoints de catálogo: CRUD, listado con semáforo ABC y carga masiva CSV (HU-06 a HU-10). */
export const productosApi = {
  buscar: (termino: string, limit = 10, signal?: AbortSignal) =>
    client.get<BusquedaProductosResponse>('/productos/buscar', {
      params: { q: termino, limit },
      signal,
    }),

  listar: (filtros: FiltrosProductos, signal?: AbortSignal) =>
    client.get<Paginated<ProductoListItemDto>>('/productos', {
      params: filtros as Record<string, string | number | boolean | undefined>,
      signal,
    }),

  obtener: (id: string) => client.get<ProductoDto>(`/productos/${id}`),

  crear: (dto: ProductoInputDTO) => client.post<ProductoDto>('/productos', dto),

  actualizar: (id: string, dto: ProductoInputDTO) => client.put<ProductoDto>(`/productos/${id}`, dto),

  /** Actualización parcial (p. ej. umbrales Min/Max manuales) (HU-38). */
  actualizarParametros: (id: string, dto: Partial<ProductoInputDTO>) =>
    client.put<ProductoDto>(`/productos/${id}`, dto),

  desactivar: (id: string) => client.delete<void>(`/productos/${id}`),

  importarCsv: (contenido: string) =>
    client.post<ImportarCsvResponse>('/productos/importar-csv', { contenido }),
};
