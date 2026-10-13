/**
 * Motor Algorítmico DSS — Punto de Reorden (ROP) y Stock de Seguridad (SS) (Épica LIB-5 / HU-20)
 * Funciones puras y determinísticas. Sin dependencia de base de datos ni de framework.
 *
 * Dispersión de la demanda diaria: sigma_d = sqrt(ID * d)  (ID = índice de dispersión, 1.6).
 * Factor de nivel de servicio z según la clase ABC:
 *  - Clase A: 99% -> z = 2.33
 *  - Clase B: 95% -> z = 1.65
 *  - Clase C: 90% -> z = 1.28
 * Stock de seguridad: SS = z * sigma_d * sqrt(L).
 * Punto de reorden: ROP = (d * L) + SS.
 */

import { CategoriaAbc } from './abcService';

export interface ParametrosRop {
  demandaPromedioDiaria: number; // d (unidades/día)
  leadTimeDias: number; // L (días)
  categoriaAbc: CategoriaAbc;
  indiceDispersion?: number; // ID (por defecto 1.6)
}

export interface ResultadoRop {
  sigmaD: number; // desviación estándar de la demanda diaria
  ss: number; // stock de seguridad
  rop: number; // punto de reorden
}

export const INDICE_DISPERSION_DEFAULT = 1.6;

export function obtenerZFactor(categoria: CategoriaAbc): number {
  switch (categoria) {
    case 'A':
      return 2.33; // 99% nivel de servicio
    case 'B':
      return 1.65; // 95% nivel de servicio
    case 'C':
      return 1.28; // 90% nivel de servicio
  }
}

export function calcularDesviacionDiaria(
  demandaPromedioDiaria: number,
  indiceDispersion: number = INDICE_DISPERSION_DEFAULT
): number {
  return Math.sqrt(Math.max(0, indiceDispersion * Math.max(0, demandaPromedioDiaria)));
}

export function calcularStockSeguridad(z: number, sigmaD: number, leadTimeDias: number): number {
  const L = Math.max(1, leadTimeDias);
  return z * sigmaD * Math.sqrt(L);
}

export function calcularRop(p: ParametrosRop): ResultadoRop {
  const ID = p.indiceDispersion ?? INDICE_DISPERSION_DEFAULT;
  const d = Math.max(0, p.demandaPromedioDiaria);
  const L = Math.max(1, p.leadTimeDias);
  const z = obtenerZFactor(p.categoriaAbc);

  const sigmaD = Math.sqrt(ID * d);
  const ss = z * sigmaD * Math.sqrt(L);
  const rop = d * L + ss;

  return {
    sigmaD: Number(sigmaD.toFixed(2)),
    ss: Number(ss.toFixed(2)),
    rop: Number(rop.toFixed(2)),
  };
}
