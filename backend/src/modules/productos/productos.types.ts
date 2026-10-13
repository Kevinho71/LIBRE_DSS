import { CreateProductoInput, UpdateProductoInput, ListProductosQueryInput } from './productos.schema';

export type CreateProductoDto = CreateProductoInput;
export type UpdateProductoDto = UpdateProductoInput;
export type ListProductosQueryDto = ListProductosQueryInput;

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

export interface ProductoListItemDto extends ProductoDto {
  categoriaAbc: 'A' | 'B' | 'C' | null;
  ropCalculado: number | null;
  estadoAlerta: EstadoAlerta;
}
