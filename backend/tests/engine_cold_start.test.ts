import { describe, it, expect } from 'vitest';
import {
  evaluarFaseArranque,
  evaluarAlertaMinMax,
  DIAS_HISTORIAL_MINIMO,
  DIAS_CON_VENTA_MINIMO,
  DIAS_UMBRAL_FASE1,
} from '../src/engine/coldStartService';

/**
 * Máquina de estados de arranque en frío (Épica LIB-6 / HU-38, HU-39).
 * Fase 1 (< 30 días): Min/Max manual. Fase 2 (30-59 días o < 20 días con venta): recopilación.
 * Fase 3 (>= 60 días y >= 20 días con venta): motor cuantitativo activo.
 */
describe('Motor Arranque en Frío — Máquina de estados (HU-38, HU-39)', () => {
  describe('evaluarFaseArranque (HU-39)', () => {
    it('un producto nuevo (sin historial) inicia en Fase 1 con Min/Max manual', () => {
      const res = evaluarFaseArranque({ diasHistorial: 0, diasConVenta: 0 });
      expect(res.fase).toBe(1);
      expect(res.cuantitativoHabilitado).toBe(false);
    });

    it('menos de 30 días de historial permanece en Fase 1', () => {
      expect(evaluarFaseArranque({ diasHistorial: 29, diasConVenta: 15 }).fase).toBe(1);
      expect(evaluarFaseArranque({ diasHistorial: 10, diasConVenta: 8 }).cuantitativoHabilitado).toBe(false);
    });

    it('entre 30 y 59 días pasa a Fase 2 (recopilación de varianza)', () => {
      expect(evaluarFaseArranque({ diasHistorial: 30, diasConVenta: 10 }).fase).toBe(2);
      expect(evaluarFaseArranque({ diasHistorial: 59, diasConVenta: 25 }).fase).toBe(2);
    });

    it('60 días de historial pero menos de 20 días con venta permanece en Fase 2', () => {
      const res = evaluarFaseArranque({ diasHistorial: 60, diasConVenta: 19 });
      expect(res.fase).toBe(2);
      expect(res.cuantitativoHabilitado).toBe(false);
    });

    it('60 días de historial y 20 días con venta transiciona a Fase 3 (algoritmo activo)', () => {
      const res = evaluarFaseArranque({ diasHistorial: 60, diasConVenta: 20 });
      expect(res.fase).toBe(3);
      expect(res.cuantitativoHabilitado).toBe(true);
    });

    it('más de 60 días y más de 20 días con venta permanece en Fase 3', () => {
      const res = evaluarFaseArranque({ diasHistorial: 90, diasConVenta: 45 });
      expect(res.fase).toBe(3);
      expect(res.cuantitativoHabilitado).toBe(true);
    });

    it('valores negativos se tratan como cero (sin transiciones espurias)', () => {
      const res = evaluarFaseArranque({ diasHistorial: -5, diasConVenta: -2 });
      expect(res.fase).toBe(1);
    });
  });

  describe('evaluarAlertaMinMax (HU-38)', () => {
    it('emite bajo_minimo cuando el stock cae al mínimo o por debajo', () => {
      expect(evaluarAlertaMinMax(5, { stockMinimo: 10, stockMaximo: 100 })).toBe('bajo_minimo');
      expect(evaluarAlertaMinMax(10, { stockMinimo: 10, stockMaximo: 100 })).toBe('bajo_minimo');
    });

    it('emite sobre_maximo cuando el stock alcanza o supera el máximo', () => {
      expect(evaluarAlertaMinMax(120, { stockMinimo: 10, stockMaximo: 100 })).toBe('sobre_maximo');
      expect(evaluarAlertaMinMax(100, { stockMinimo: 10, stockMaximo: 100 })).toBe('sobre_maximo');
    });

    it('no emite alerta dentro del rango ni sin umbrales configurados', () => {
      expect(evaluarAlertaMinMax(50, { stockMinimo: 10, stockMaximo: 100 })).toBeNull();
      expect(evaluarAlertaMinMax(50, { stockMinimo: null, stockMaximo: null })).toBeNull();
      expect(evaluarAlertaMinMax(5, { stockMinimo: null, stockMaximo: 100 })).toBeNull();
      expect(evaluarAlertaMinMax(150, { stockMinimo: 10, stockMaximo: null })).toBeNull();
    });
  });

  describe('constantes de umbral', () => {
    it('expone los umbrales canónicos 60/20 y el límite de Fase 1 (30 días)', () => {
      expect(DIAS_HISTORIAL_MINIMO).toBe(60);
      expect(DIAS_CON_VENTA_MINIMO).toBe(20);
      expect(DIAS_UMBRAL_FASE1).toBe(30);
    });
  });
});
