/**
 * Motor Algorítmico DSS — Sistema P de Revisión Periódica (Épica LIB-6 / HU-23)
 * Funciones puras y determinísticas. Sin dependencia de base de datos ni de framework.
 *
 * Aplica a productos de Clase C para minimizar el esfuerzo administrativo.
 * Intervalo de revisión: R = max(7, round(EOQ / d)).
 * Stock de seguridad del período de protección R + L: SS_P = z * sigma_d * sqrt(R + L), con z = 1.28.
 * Nivel objetivo de inventario: T = d * (R + L) + SS_P.
 * Sugerencia de pedido al cumplirse el ciclo de revisión: q = max(0, T - IP).
 */

import { CategoriaAbc } from './abcService';

export type PoliticaInventario = 'Q' | 'P';

export interface ParametrosSistemaP {
  demandaPromedioDiaria: number; // d (unidades/día)
  leadTimeDias: number; // L (días)
  eoq: number; // EOQ recomendado (el backend lo deriva con H = i * C; el catálogo PoC usa H explícito)
  indiceDispersion?: number; // ID (por defecto 1.6)
}

export interface ResultadoSistemaP {
  R: number; // intervalo de revisión (días)
  sigmaD: number; // desviación estándar de la demanda diaria
  ssP: number; // stock de seguridad del período de protección R + L
  T: number; // nivel objetivo de inventario
}

export const Z_SISTEMA_P = 1.28; // 80% - 90% de nivel de servicio (Clase C)
export const INTERVALO_MINIMO_REVISION = 7; // días
export const INDICE_DISPERSION_DEFAULT = 1.6;

/**
 * Asigna la política de inventario según la criticidad ABC (HU-23):
 *  - Clases A y B: Revisión Continua (Sistema Q).
 *  - Clase C: Revisión Periódica (Sistema P).
 */
export function asignarPolitica(categoria: CategoriaAbc): PoliticaInventario {
  return categoria === 'C' ? 'P' : 'Q';
}

export function calcularSistemaP(p: ParametrosSistemaP): ResultadoSistemaP {
  const d = Math.max(0, p.demandaPromedioDiaria);
  const L = Math.max(1, p.leadTimeDias);
  const ID = p.indiceDispersion ?? INDICE_DISPERSION_DEFAULT;

  const sigmaD = Math.sqrt(ID * d);

  const rCalculado = d > 0 ? Math.round(p.eoq / d) : INTERVALO_MINIMO_REVISION;
  const R = Math.max(INTERVALO_MINIMO_REVISION, rCalculado);

  // SS_P y T se calculan con precisión completa y se redondean solo al final,
  // de modo que T incorpore el SS_P sin redondeo intermedio (oráculo PROD-004).
  const ssP = Z_SISTEMA_P * sigmaD * Math.sqrt(R + L);
  const T = d * (R + L) + ssP;

  return {
    R,
    sigmaD: Number(sigmaD.toFixed(2)),
    ssP: Number(ssP.toFixed(2)),
    T: Number(T.toFixed(2)),
  };
}

export function calcularSugerenciaPedido(nivelObjetivoT: number, posicionInventario: number): number {
  const cantidad = Math.max(0, nivelObjetivoT - posicionInventario);
  return Number(cantidad.toFixed(2));
}
