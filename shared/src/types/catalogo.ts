import type { CategoriaAbc, OrigenDatoProducto } from './entities';

// ==========================================
// Catálogo, proveedores y freemium (Sprint 1 — LIB-15 a LIB-21)
// ==========================================

export interface PaginacionMeta {
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface Paginated<T> {
  data: T[];
  paginacion: PaginacionMeta;
}

/** Estado de alerta de stock derivado en el backend (HU-09). */
export type EstadoAlerta = 'normal' | 'stock_minimo' | 'rop_alcanzado' | 'sin_stock';

export interface ProductoDto {
  id: string;
  empresaId: string;
  sku: string | null;
  nombre: string;
  unidadMedida: string;
  unidadCompra: string | null;
  factorConversion: number;
  costoUnitario: number;
  precioVenta: number;
  costoPedido: number;
  tasaMantenimientoAnual: number;
  stockActual: number;
  stockMinimoManual: number | null;
  stockMaximoManual: number | null;
  origenDato: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Fila del listado de catálogo con clasificación ABC y estado de alerta (HU-09). */
export interface ProductoListItemDto extends ProductoDto {
  categoriaAbc: CategoriaAbc | null;
  ropCalculado: number | null;
  estadoAlerta: EstadoAlerta;
}

/** Payload de alta/edición de producto con parámetros logísticos (HU-06, HU-07). */
export interface ProductoInputDTO {
  nombre: string;
  sku?: string | null;
  unidadMedida?: string;
  unidadCompra?: string | null;
  factorConversion?: number;
  costoUnitario: number;
  precioVenta: number;
  costoPedido?: number;
  tasaMantenimientoAnual?: number;
  stockActual?: number;
  stockMinimoManual?: number | null;
  stockMaximoManual?: number | null;
  origenDato?: OrigenDatoProducto;
}

export interface FiltrosProductos {
  page?: number;
  limit?: number;
  buscar?: string;
  soloAlertas?: boolean;
}

export interface ProveedorDto {
  id: string;
  empresaId: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  createdAt: string;
}

export interface ProductoProveedorDto {
  id: string;
  empresaId: string;
  productoId: string;
  proveedorId: string;
  codigoProveedor: string | null;
  costoCompra: number | null;
  leadTimeDias: number;
  costoPedido: number;
  loteMinimo: number;
  esPrincipal: boolean;
  proveedorNombre?: string;
}

export interface CrearProveedorDTO {
  nombre: string;
  contacto?: string | null;
  telefono?: string | null;
}

/** Vínculo N:M producto↔proveedor con parámetros de compra (HU-08, CB-02). */
export interface AsociarProductoProveedorDTO {
  proveedorId: string;
  codigoProveedor?: string | null;
  costoCompra?: number | null;
  leadTimeDias?: number;
  costoPedido?: number;
  loteMinimo?: number;
  esPrincipal?: boolean;
}
