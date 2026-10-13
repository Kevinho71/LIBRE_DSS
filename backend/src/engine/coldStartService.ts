/**
 * Motor Algorítmico DSS — Arranque en Frío (Épica LIB-6 / HU-38, HU-39)
 * Funciones puras y determinísticas. Sin dependencia de base de datos ni de framework.
 *
 * Máquina de estados del ciclo de vida del SKU:
 *  - Fase 1 (< 30 días de historial): alertas por Min/Max manual, sin fórmulas estocásticas.
 *  - Fase 2 (30 <= días < 60 ó < 20 días con venta): recopilación de métricas de varianza.
 *  - Fase 3 (>= 60 días de historial Y >= 20 días con venta): activación del motor cuantitativo.
 */

export type FaseArranque = 1 | 2 | 3;

export interface EstadoSKU {
  diasHistorial: number;
  diasConVenta: number;
}

export interface ResultadoFaseArranque {
  fase: FaseArranque;
  cuantitativoHabilitado: boolean;
}

export const DIAS_HISTORIAL_MINIMO = 60; // umbral de días para activar el motor cuantitativo
export const DIAS_CON_VENTA_MINIMO = 20; // umbral de días con venta para activar el motor cuantitativo
export const DIAS_UMBRAL_FASE1 = 30; // por debajo de este historial se opera en Min/Max manual

export function evaluarFaseArranque(estado: EstadoSKU): ResultadoFaseArranque {
  const diasHistorial = Math.max(0, estado.diasHistorial);
  const diasConVenta = Math.max(0, estado.diasConVenta);

  if (diasHistorial < DIAS_UMBRAL_FASE1) {
    return { fase: 1, cuantitativoHabilitado: false };
  }

  if (diasHistorial < DIAS_HISTORIAL_MINIMO || diasConVenta < DIAS_CON_VENTA_MINIMO) {
    return { fase: 2, cuantitativoHabilitado: false };
  }

  return { fase: 3, cuantitativoHabilitado: true };
}

export type TipoAlertaMinMax = 'bajo_minimo' | 'sobre_maximo' | null;

export interface UmbralesMinMax {
  stockMinimo: number | null;
  stockMaximo: number | null;
}

/**
 * Evalúa la política heurística Min/Max manual para productos en arranque en frío (HU-38).
 *  - 'bajo_minimo'  cuando el stock cae al umbral mínimo o por debajo.
 *  - 'sobre_maximo' cuando el stock supera el umbral máximo.
 *  - null cuando no hay umbrales configurados o el stock se encuentra dentro del rango.
 */
export function evaluarAlertaMinMax(stockActual: number, umbrales: UmbralesMinMax): TipoAlertaMinMax {
  const stock = Math.max(0, stockActual);

  if (umbrales.stockMinimo != null && stock <= umbrales.stockMinimo) {
    return 'bajo_minimo';
  }

  if (umbrales.stockMaximo != null && stock >= umbrales.stockMaximo) {
    return 'sobre_maximo';
  }

  return null;
}
