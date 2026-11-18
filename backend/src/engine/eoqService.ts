/**
 * Motor Algorítmico DSS — Cantidad Económica de Pedido (EOQ) (Épica LIB-5 / HU-19)
 * Función pura y determinística. Sin dependencia de base de datos ni de framework.
 *
 * Fórmula base: EOQ = sqrt(2 * D * S / H), con H = i * C.
 * Restricciones de negocio:
 *  - Lote mínimo del proveedor: EOQ = max(EOQ, loteMinimo).
 *  - Tope de capital de trabajo por pedido: EOQ = min(EOQ, floor(topeCapital / C)).
 */

export interface ParametrosEoq {
  demandaAnual: number; // D (unidades/año)
  costoPedido: number; // S (Bs/pedido)
  costoUnitario: number; // C (Bs/unidad)
  tasaMantenimiento?: number; // i (por defecto 0.20 = 20%)
  loteMinimo?: number; // Tamaño mínimo de compra del proveedor
  topeCapitalPedido?: number; // Límite de compra por orden (Bs)
}

export interface ResultadoEoq {
  eoqTeorico: number;
  eoqRecomendado: number;
}

export const TASA_MANTENIMIENTO_DEFAULT = 0.2;
export const TOPE_CAPITAL_PEDIDO_DEFAULT = 15000;

export function calcularEoq(p: ParametrosEoq): ResultadoEoq {
  const i = p.tasaMantenimiento ?? TASA_MANTENIMIENTO_DEFAULT;
  const H = i * p.costoUnitario;

  if (p.demandaAnual <= 0 || p.costoPedido <= 0 || H <= 0) {
    return { eoqTeorico: 0, eoqRecomendado: 0 };
  }

  const eoqTeorico = Math.sqrt((2 * p.demandaAnual * p.costoPedido) / H);
  let eoqRecomendado = Math.round(eoqTeorico);

  // Restricción 1: lote mínimo del proveedor.
  if (p.loteMinimo != null && p.loteMinimo > 0) {
    eoqRecomendado = Math.max(eoqRecomendado, p.loteMinimo);
  }

  // Restricción 2: tope de capital de trabajo por pedido.
  if (p.topeCapitalPedido != null && p.topeCapitalPedido > 0 && p.costoUnitario > 0) {
    const unidadesMaximas = Math.floor(p.topeCapitalPedido / p.costoUnitario);
    if (unidadesMaximas > 0) {
      eoqRecomendado = Math.min(eoqRecomendado, unidadesMaximas);
    }
  }

  return {
    eoqTeorico: Number(eoqTeorico.toFixed(2)),
    eoqRecomendado,
  };
}
