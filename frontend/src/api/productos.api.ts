import { client } from './client';

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

export const productosApi = {
  buscar: (termino: string, limit = 10, signal?: AbortSignal) =>
    client.get<BusquedaProductosResponse>('/productos/buscar', {
      params: { q: termino, limit },
      signal,
    }),
};
