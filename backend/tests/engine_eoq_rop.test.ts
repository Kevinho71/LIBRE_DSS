import { describe, it, expect } from 'vitest';
import { calcularEoq, TASA_MANTENIMIENTO_DEFAULT, TOPE_CAPITAL_PEDIDO_DEFAULT } from '../src/engine/eoqService';
import { calcularRop, obtenerZFactor, calcularDesviacionDiaria } from '../src/engine/ropService';
import { calcularPosicionInventario, evaluarReorden } from '../src/engine/inventoryPosition';

/**
 * Oráculo numérico de la Prueba de Concepto (poc_simulacion.py) y Capítulo 6 de Postulacion.tex.
 * PROD-001 (Clase A): D = 6000, C = 65, S = 150, H = 13 (i = 0.20), L = 3.
 *   d = D/365 = 16.44 · sigma_d = 5.13 · SS = 20.70 · ROP = 70.01 · EOQ teórico = 372.10 · EOQ real = 230.
 */
describe('Motor EOQ/ROP — Oráculo numérico (concordancia con poc_simulacion.py)', () => {
  describe('calcularEoq (HU-19)', () => {
    it('PROD-001: EOQ teórico 372.10 y recomendado 230 por tope de capital', () => {
      const res = calcularEoq({
        demandaAnual: 6000,
        costoPedido: 150,
        costoUnitario: 65,
        tasaMantenimiento: 0.2,
        topeCapitalPedido: 15000,
      });

      expect(res.eoqTeorico).toBeCloseTo(372.1, 2);
      // floor(15000 / 65) = 230 -> min(round(372.10)=372, 230) = 230
      expect(res.eoqRecomendado).toBe(230);
    });

    it('aplica lote mínimo del proveedor cuando supera al EOQ calculado', () => {
      const res = calcularEoq({
        demandaAnual: 120,
        costoPedido: 50,
        costoUnitario: 10,
        tasaMantenimiento: 0.2,
        loteMinimo: 100,
      });

      // EOQ teórico = sqrt(2*120*50/2) = sqrt(6000) = 77.46 -> round 77 -> max(77, 100) = 100
      expect(res.eoqRecomendado).toBe(100);
    });

    it('devuelve cero cuando la demanda anual es nula o negativa', () => {
      expect(calcularEoq({ demandaAnual: 0, costoPedido: 50, costoUnitario: 10 })).toEqual({
        eoqTeorico: 0,
        eoqRecomendado: 0,
      });
    });

    it('devuelve cero cuando el costo de mantenimiento es nulo', () => {
      const res = calcularEoq({
        demandaAnual: 1000,
        costoPedido: 50,
        costoUnitario: 0,
        tasaMantenimiento: 0.2,
      });
      expect(res).toEqual({ eoqTeorico: 0, eoqRecomendado: 0 });
    });

    it('expone las constantes por defecto del motor', () => {
      expect(TASA_MANTENIMIENTO_DEFAULT).toBe(0.2);
      expect(TOPE_CAPITAL_PEDIDO_DEFAULT).toBe(15000);
    });
  });

  describe('calcularRop y stock de seguridad (HU-20)', () => {
    it('PROD-001 (Clase A): sigma_d=5.13, SS=20.70, ROP=70.01', () => {
      const d = 6000 / 365; // 16.438...
      const res = calcularRop({
        demandaPromedioDiaria: d,
        leadTimeDias: 3,
        categoriaAbc: 'A',
      });

      expect(res.sigmaD).toBeCloseTo(5.13, 2);
      expect(res.ss).toBeCloseTo(20.7, 2);
      expect(res.rop).toBeCloseTo(70.01, 2);
    });

    it('asigna el factor z correcto por clase ABC', () => {
      expect(obtenerZFactor('A')).toBe(2.33);
      expect(obtenerZFactor('B')).toBe(1.65);
      expect(obtenerZFactor('C')).toBe(1.28);
    });

    it('Clase B usa z=1.65 y reduce el stock de seguridad frente a la Clase A', () => {
      const d = 16.44;
      const resB = calcularRop({ demandaPromedioDiaria: d, leadTimeDias: 3, categoriaAbc: 'B' });
      expect(resB.ss).toBeCloseTo(14.66, 1); // 1.65 * 5.13 * sqrt(3) = 14.66
    });

    it('demanda diaria cero produce sigma_d, SS y ROP nulos', () => {
      const res = calcularRop({ demandaPromedioDiaria: 0, leadTimeDias: 3, categoriaAbc: 'A' });
      expect(res.sigmaD).toBe(0);
      expect(res.ss).toBe(0);
      expect(res.rop).toBe(0);
    });

    it('calcula la desviación diaria consistente con el índice de dispersión', () => {
      expect(calcularDesviacionDiaria(16.44)).toBeCloseTo(5.13, 2);
      expect(calcularDesviacionDiaria(16.44, 1.0)).toBeCloseTo(4.05, 2);
    });
  });

  describe('Posición de inventario y regla de reorden (HU-21)', () => {
    it('IP = stock + en tránsito - backorders', () => {
      expect(
        calcularPosicionInventario({ stockActual: 40, enTransito: 20, backorders: 5 })
      ).toBe(55);
    });

    it('no permite backorders ni en tránsito negativos', () => {
      expect(calcularPosicionInventario({ stockActual: 10, enTransito: -3, backorders: 0 })).toBe(10);
    });

    it('emite reorden cuando la posición cae al ROP o por debajo', () => {
      expect(evaluarReorden(50, 60)).toBe(true);
      expect(evaluarReorden(60, 60)).toBe(true);
      expect(evaluarReorden(61, 60)).toBe(false);
    });
  });
});
