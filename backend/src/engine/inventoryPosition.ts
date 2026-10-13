/**
 * Motor Algorítmico DSS — Posición de Inventario y Evaluación de Reorden (Épica LIB-5 / HU-21)
 * Funciones puras y determinísticas. Sin dependencia de base de datos ni de framework.
 *
 * Posición de Inventario: IP = Stock Actual + En Tránsito - Backorders.
 * Regla de reorden: se dispara una alerta cuando IP <= ROP.
 */

export interface ComponentesPosicion {
  stockActual: number;
  enTransito: number; // pedidos emitidos y aún no recibidos (orden_compra en_transito)
  backorders?: number; // demanda comprometida pendiente de servir
}

export function calcularPosicionInventario(p: ComponentesPosicion): number {
  const stock = Math.max(0, p.stockActual);
  const transito = Math.max(0, p.enTransito);
  const backorders = Math.max(0, p.backorders ?? 0);
  return stock + transito - backorders;
}

export function evaluarReorden(posicionInventario: number, rop: number): boolean {
  return posicionInventario <= rop;
}
