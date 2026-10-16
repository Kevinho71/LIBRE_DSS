import type { EstadoPagoTransaccion, TipoTransaccion } from '@libredss/shared';

const formatterMoneda = new Intl.NumberFormat('es-BO', {
  style: 'currency',
  currency: 'BOB',
  minimumFractionDigits: 2,
});

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return formatterMoneda.format(value);
}

/** Devuelve la fecha local del día en formato ISO corto `YYYY-MM-DD`. */
export function hoyISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const TIPO_TRANSACCION_LABELS: Record<TipoTransaccion, string> = {
  venta: 'Venta',
  ingreso: 'Ingreso',
  merma: 'Merma',
  ajuste: 'Ajuste',
  venta_perdida: 'Venta perdida',
  devolucion_cliente: 'Devolución cliente',
  devolucion_proveedor: 'Devolución proveedor',
};

export const ESTADO_PAGO_LABELS: Record<EstadoPagoTransaccion, string> = {
  contado: 'Contado',
  credito_pendiente: 'Crédito pendiente',
  credito_pagado: 'Crédito pagado',
};

export const TIPOS_FILTRO: Array<{ value: TipoTransaccion; label: string }> = (
  Object.keys(TIPO_TRANSACCION_LABELS) as TipoTransaccion[]
).map((value) => ({ value, label: TIPO_TRANSACCION_LABELS[value] }));

export function labelTipoTransaccion(tipo: string): string {
  return TIPO_TRANSACCION_LABELS[tipo as TipoTransaccion] ?? tipo;
}

export function labelEstadoPago(estado: string): string {
  return ESTADO_PAGO_LABELS[estado as EstadoPagoTransaccion] ?? estado;
}
