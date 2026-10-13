import { describe, it, expect } from 'vitest';
import {
  calcularSistemaP,
  asignarPolitica,
  calcularSugerenciaPedido,
  Z_SISTEMA_P,
  INTERVALO_MINIMO_REVISION,
} from '../src/engine/periodicService';

/**
 * Oráculo numérico del Sistema P de Revisión Periódica (Épica LIB-6 / HU-23).
 * PROD-004 (Clase C): D = 3500, C = 8, S = 15, H = 2, L = 3.
 *   d = 3500/365 = 9.589 · EOQ (H=2) = sqrt(2*3500*15/2) = 229.13.
 *   R = max(7, round(229.13/9.589)) = 24 · SS_P = 26.05 · T = 284.96.
 */
describe('Motor Sistema P — Oráculo numérico PROD-004 (concordancia con poc_simulacion.py)', () => {
  describe('calcularSistemaP (HU-23)', () => {
    it('PROD-004 (Clase C): R=24, SS_P=26.05, T=284.96', () => {
      const D = 3500;
      const d = D / 365; // 9.589...
      const eoq = Math.sqrt((2 * D * 15) / 2); // 229.13 (H explícito del catálogo PoC)

      const res = calcularSistemaP({ demandaPromedioDiaria: d, leadTimeDias: 3, eoq });

      expect(res.R).toBe(24);
      expect(res.ssP).toBeCloseTo(26.05, 2);
      expect(res.T).toBeCloseTo(284.96, 2);
    });

    it('aplica el intervalo mínimo de revisión de 7 días', () => {
      const res = calcularSistemaP({ demandaPromedioDiaria: 10, leadTimeDias: 3, eoq: 10 });
      // round(10/10) = 1 -> max(7, 1) = 7
      expect(res.R).toBe(7);
    });

    it('demanda diaria nula produce R mínimo y sigma_d/SS_P/T nulos', () => {
      const res = calcularSistemaP({ demandaPromedioDiaria: 0, leadTimeDias: 3, eoq: 100 });
      expect(res.R).toBe(7);
      expect(res.sigmaD).toBe(0);
      expect(res.ssP).toBe(0);
      expect(res.T).toBe(0);
    });

    it('el stock de seguridad crece con el lead time (período de protección R+L)', () => {
      const corto = calcularSistemaP({ demandaPromedioDiaria: 9.589, leadTimeDias: 3, eoq: 229.13 });
      const largo = calcularSistemaP({ demandaPromedioDiaria: 9.589, leadTimeDias: 10, eoq: 229.13 });
      expect(largo.ssP).toBeGreaterThan(corto.ssP);
      expect(largo.T).toBeGreaterThan(corto.T);
    });
  });

  describe('asignarPolitica (HU-23)', () => {
    it('asigna Sistema Q a las Clases A y B, y Sistema P a la Clase C', () => {
      expect(asignarPolitica('A')).toBe('Q');
      expect(asignarPolitica('B')).toBe('Q');
      expect(asignarPolitica('C')).toBe('P');
    });
  });

  describe('calcularSugerenciaPedido', () => {
    it('sugiere q = max(0, T - IP)', () => {
      expect(calcularSugerenciaPedido(100, 40)).toBe(60);
      expect(calcularSugerenciaPedido(100, 120)).toBe(0);
      expect(calcularSugerenciaPedido(100, 100)).toBe(0);
    });
  });

  describe('constantes del motor', () => {
    it('expone el factor z y el intervalo mínimo de revisión', () => {
      expect(Z_SISTEMA_P).toBe(1.28);
      expect(INTERVALO_MINIMO_REVISION).toBe(7);
    });
  });
});
