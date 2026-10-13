import { transacciones } from '../../db/schema';

export type TipoTransaccion =
  | 'venta'
  | 'ingreso'
  | 'merma'
  | 'ajuste'
  | 'venta_perdida'
  | 'devolucion_cliente'
  | 'devolucion_proveedor';

export type EstadoPago = 'contado' | 'credito_pendiente' | 'credito_pagado';

export interface RegistrarVentaDto {
  productoId: string;
  cantidad: number;
  precioVenta?: number;
  costoUnitario?: number;
  estadoPago?: EstadoPago;
  fechaEvento?: string; // YYYY-MM-DD
  llaveIdempotencia?: string;
  motivo?: string;
}

export interface ItemVentaBatchDto {
  productoId: string;
  cantidad: number;
  precioVenta?: number;
}

export interface RegistrarVentaBatchDto {
  notaId?: string; // UUID opcional
  items: ItemVentaBatchDto[];
  estadoPago?: EstadoPago;
  fechaEvento?: string;
  llaveIdempotencia?: string;
  motivo?: string;
}

export interface RegistrarIngresoDto {
  productoId: string;
  cantidad: number;
  esUnidadCompra?: boolean; // si true, multiplica por factor_conversion del producto (CB-04)
  costoUnitarioIngreso?: number;
  actualizarCostoReposicion?: boolean; // si true, actualiza costo_unitario en producto (CB-01)
  ordenCompraId?: string; // opcional, para enlazar y recibir pedido en tránsito
  fechaEvento?: string;
  llaveIdempotencia?: string;
  motivo?: string;
}

export interface RegistrarAjusteDto {
  productoId: string;
  conteoFisico?: number; // Para arqueo / conteo físico (CB-06)
  cantidad?: number; // Para merma directa
  motivo: string; // Obligatorio para registrar la causa del ajuste o merma
  fechaEvento?: string;
  llaveIdempotencia?: string;
}

export interface RegistrarDevolucionDto {
  productoId: string;
  tipo: 'devolucion_cliente' | 'devolucion_proveedor'; // CB-05
  cantidad: number;
  notaId?: string;
  motivo?: string;
  fechaEvento?: string;
  llaveIdempotencia?: string;
}

export interface ActualizarEstadoPagoDto {
  estadoPago: EstadoPago;
}

export interface FiltroTransaccionesDto {
  page?: number;
  limit?: number;
  productoId?: string;
  tipo?: TipoTransaccion;
  desde?: string; // YYYY-MM-DD
  hasta?: string; // YYYY-MM-DD
  notaId?: string;
  estadoPago?: EstadoPago;
}

export interface TransaccionItemResponse {
  id: string;
  empresaId: string;
  notaId: string | null;
  productoId: string;
  tipo: string;
  cantidad: number;
  costoUnitarioHistorico: number;
  precioVentaHistorico: number | null;
  motivo: string | null;
  estadoPago: string;
  llaveIdempotencia: string | null;
  fechaEvento: string;
  fechaRegistro: Date;
  producto?: {
    id: string;
    sku: string | null;
    nombre: string;
    unidadMedida: string;
  };
}
