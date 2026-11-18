import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  hoyISO,
  labelTipoTransaccion,
  labelEstadoPago,
  TIPOS_FILTRO,
} from '@/lib/format';

describe('formato de valores transaccionales', () => {
  it('hoyISO produce una fecha local YYYY-MM-DD', () => {
    expect(hoyISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(hoyISO(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('formatCurrency representa montos en bolivianos y trata nulos', () => {
    expect(formatCurrency(1234.5)).toContain('1.234,50');
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(undefined)).toBe('—');
  });

  it('formatDate tolera valores inválidos', () => {
    expect(formatDate('no-es-fecha')).toBe('—');
    expect(formatDate(null)).toBe('—');
  });

  it('traduce tipos y estados, con fallback al valor crudo', () => {
    expect(labelTipoTransaccion('venta')).toBe('Venta');
    expect(labelTipoTransaccion('desconocido')).toBe('desconocido');
    expect(labelEstadoPago('credito_pendiente')).toBe('Crédito pendiente');
    expect(labelEstadoPago('x')).toBe('x');
  });

  it('expone los tipos disponibles para el filtro del Kardex', () => {
    expect(TIPOS_FILTRO.map((t) => t.value)).toContain('venta');
    expect(TIPOS_FILTRO.map((t) => t.value)).toContain('devolucion_proveedor');
  });
});
