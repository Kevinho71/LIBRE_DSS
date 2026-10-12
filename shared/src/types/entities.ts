export type PlanEmpresa = 'gratuito' | 'pago';
export type RolUsuario = 'administrador' | 'operador';

export interface Empresa {
  id: string;
  nombre: string;
  nit?: string | null;
  plan: PlanEmpresa;
  createdAt: Date;
  updatedAt: Date;
}

export interface Usuario {
  id: string;
  empresaId: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  createdAt: Date;
}

export type OrigenDatoProducto = 'manual' | 'csv' | 'ocr';

export interface Producto {
  id: string;
  empresaId: string;
  sku?: string | null;
  nombre: string;
  unidadMedida: string;
  unidadCompra?: string | null;
  factorConversion: number;
  costoUnitario: number;
  precioVenta: number;
  costoPedido: number;
  tasaMantenimientoAnual: number;
  stockActual: number;
  stockMinimoManual?: number | null;
  stockMaximoManual?: number | null;
  origenDato: OrigenDatoProducto;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Proveedor {
  id: string;
  empresaId: string;
  nombre: string;
  contacto?: string | null;
  telefono?: string | null;
  createdAt: Date;
}

export interface ProductoProveedor {
  id: string;
  empresaId: string;
  productoId: string;
  proveedorId: string;
  codigoProveedor?: string | null;
  costoCompra?: number | null;
  leadTimeDias: number;
  costoPedido: number;
  loteMinimo: number;
  esPrincipal: boolean;
}

export type TipoTransaccion =
  | 'venta'
  | 'ingreso'
  | 'merma'
  | 'ajuste'
  | 'venta_perdida'
  | 'devolucion_cliente'
  | 'devolucion_proveedor';

export type EstadoPagoTransaccion = 'contado' | 'credito_pendiente' | 'credito_pagado';

export interface Transaccion {
  id: string;
  empresaId: string;
  notaId?: string | null;
  productoId: string;
  tipo: TipoTransaccion;
  cantidad: number;
  costoUnitarioHistorico: number;
  precioVentaHistorico?: number | null;
  motivo?: string | null;
  estadoPago: EstadoPagoTransaccion;
  llaveIdempotencia?: string | null;
  fechaEvento: string;
  fechaRegistro: Date;
}

export type EstadoOrdenCompra = 'en_transito' | 'recibido' | 'cancelado';

export interface OrdenCompra {
  id: string;
  empresaId: string;
  productoId: string;
  proveedorId: string;
  cantidadPedida: number;
  estado: EstadoOrdenCompra;
  fechaEmision: string;
  fechaEntregaEstimada?: string | null;
  createdAt: Date;
}

export type CategoriaAbc = 'A' | 'B' | 'C';
export type PoliticaRevision = 'Q' | 'P';

export interface ParametrosCalculo {
  id: string;
  empresaId: string;
  productoId: string;
  categoriaAbc?: CategoriaAbc | null;
  politica: PoliticaRevision;
  demandaPromedioDiaria?: number | null;
  desviacionEstandarDiaria?: number | null;
  diasHistorial: number;
  diasConVenta: number;
  faseArranque: number;
  eoqCalculado?: number | null;
  ropCalculado?: number | null;
  stockSeguridadCalculado?: number | null;
  intervaloRevisionDias?: number | null;
  nivelObjetivoT?: number | null;
  esVigente: boolean;
  fechaCalculo: Date;
}
