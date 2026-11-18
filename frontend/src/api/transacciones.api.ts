import { client } from './client';
import type { EstadoPagoTransaccion, TipoTransaccion } from '@libredss/shared';

export interface TransaccionProductoResumen {
  id: string;
  sku: string | null;
  nombre: string;
  unidadMedida: string;
}

export interface TransaccionItem {
  id: string;
  empresaId: string;
  notaId: string | null;
  productoId: string;
  tipo: TipoTransaccion;
  cantidad: number;
  costoUnitarioHistorico: number;
  precioVentaHistorico: number | null;
  motivo: string | null;
  estadoPago: EstadoPagoTransaccion;
  llaveIdempotencia: string | null;
  fechaEvento: string;
  fechaRegistro: string;
  producto?: TransaccionProductoResumen;
}

export interface PaginacionMeta {
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface TransaccionesPaginadas {
  data: TransaccionItem[];
  paginacion: PaginacionMeta;
}

export interface NotaTransacciones {
  notaId: string;
  items: TransaccionItem[];
  totalItems: number;
}

export interface AlertaReabastecimiento {
  productoId: string;
  sku: string | null;
  nombre: string;
  categoriaAbc: 'A' | 'B' | 'C';
  stockActual: number;
  enTransito: number;
  posicionInventario: number;
  ropCalculado: number;
  stockSeguridad: number;
  eoqSugerido: number;
  deficit: number;
}

export interface ResultadoVenta {
  idempotente: boolean;
  transaccion: TransaccionItem;
  nuevoStock?: number;
  alerta?: AlertaReabastecimiento | null;
  mensaje: string;
}

export interface ResultadoVentaBatch {
  idempotente: boolean;
  notaId: string;
  transacciones: TransaccionItem[];
  totalItems?: number;
  alertas?: AlertaReabastecimiento[];
  mensaje: string;
}

export interface ResultadoMovimiento {
  idempotente: boolean;
  transaccion: TransaccionItem;
  nuevoStock?: number;
  mensaje: string;
}

export interface FiltrosTransacciones {
  page?: number;
  limit?: number;
  productoId?: string;
  tipo?: TipoTransaccion;
  desde?: string;
  hasta?: string;
  notaId?: string;
  estadoPago?: EstadoPagoTransaccion;
}

export interface ItemVentaRequest {
  productoId: string;
  cantidad: number;
  precioVenta?: number;
}

export interface RegistrarVentaBatchRequest {
  notaId?: string;
  items: ItemVentaRequest[];
  estadoPago?: 'contado' | 'credito_pendiente';
  fechaEvento?: string;
  llaveIdempotencia?: string;
  motivo?: string;
}

export interface RegistrarIngresoRequest {
  productoId: string;
  cantidad: number;
  esUnidadCompra?: boolean;
  costoUnitarioIngreso?: number;
  actualizarCostoReposicion?: boolean;
  fechaEvento?: string;
  llaveIdempotencia?: string;
  motivo?: string;
}

export interface RegistrarAjusteRequest {
  productoId: string;
  conteoFisico?: number;
  cantidad?: number;
  motivo: string;
  fechaEvento?: string;
  llaveIdempotencia?: string;
}

export interface RegistrarDevolucionRequest {
  productoId: string;
  tipo: 'devolucion_cliente' | 'devolucion_proveedor';
  cantidad: number;
  notaId?: string;
  motivo?: string;
  fechaEvento?: string;
  llaveIdempotencia?: string;
}

export const transaccionesApi = {
  registrarVentaBatch: (payload: RegistrarVentaBatchRequest) =>
    client.post<ResultadoVentaBatch>('/transacciones/batch', payload, {
      idempotencyKey: payload.llaveIdempotencia,
    }),

  registrarIngreso: (payload: RegistrarIngresoRequest) =>
    client.post<ResultadoMovimiento>('/transacciones/ingreso', payload, {
      idempotencyKey: payload.llaveIdempotencia,
    }),

  registrarAjuste: (payload: RegistrarAjusteRequest) =>
    client.post<ResultadoMovimiento>('/transacciones/ajuste', payload, {
      idempotencyKey: payload.llaveIdempotencia,
    }),

  registrarDevolucion: (payload: RegistrarDevolucionRequest) =>
    client.post<ResultadoMovimiento>('/transacciones/devolucion', payload, {
      idempotencyKey: payload.llaveIdempotencia,
    }),

  listar: (filtros: FiltrosTransacciones, signal?: AbortSignal) =>
    client.get<TransaccionesPaginadas>('/transacciones', {
      params: filtros as Record<string, string | number | boolean | undefined>,
      signal,
    }),

  obtenerPorNota: (notaId: string) =>
    client.get<NotaTransacciones>(`/transacciones/notas/${notaId}`),

  actualizarPago: (transaccionId: string, estadoPago: EstadoPagoTransaccion) =>
    client.patch<TransaccionItem>(`/transacciones/${transaccionId}/pago`, { estadoPago }),

  actualizarPagoPorNota: (notaId: string, estadoPago: EstadoPagoTransaccion) =>
    client.patch<{ notaId: string; estadoPago: EstadoPagoTransaccion; afectadas: number }>(
      `/transacciones/notas/${notaId}/pago`,
      { estadoPago }
    ),
};
