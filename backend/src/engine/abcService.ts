/**
 * Motor Algorítmico DSS — Clasificación ABC (Épica LIB-4 / HU-16)
 * Funciones puras y determinísticas. Sin dependencia del framework de base de datos.
 *
 * Regla de clasificación (Pareto 80/15/5):
 *  - Clase A: productos que acumulan hasta el 80% del valor de consumo anual total.
 *  - Clase B: productos que acumulan entre el 80% y el 95%.
 *  - Clase C: productos restantes (95% al 100%).
 */

export type CategoriaAbc = 'A' | 'B' | 'C';

export interface ItemDemandaAbc {
  productoId: string;
  demandaAnual: number; // D (unidades/año)
  costoUnitario: number; // C (costo de reposición vigente, CB-01)
}

export interface ResultadoAbc {
  productoId: string;
  demandaAnual: number;
  costoUnitario: number;
  valorConsumoAnual: number; // V = D * C
  porcentajeValor: number; // % individual sobre V total
  porcentajeAcumulado: number; // % acumulado (curva de Pareto)
  categoria: CategoriaAbc;
}

export const UMBRAL_CLASE_A = 80;
export const UMBRAL_CLASE_B = 95;

export function round2(value: number): number {
  return Number(value.toFixed(2));
}

export function clasificarAbc(items: ItemDemandaAbc[]): ResultadoAbc[] {
  if (items.length === 0) return [];

  const calculados = items.map((it) => ({
    productoId: it.productoId,
    demandaAnual: it.demandaAnual,
    costoUnitario: it.costoUnitario,
    valorConsumoAnual: Math.max(0, it.demandaAnual) * Math.max(0, it.costoUnitario),
  }));

  // Ordenamiento descendente por valor de consumo anual (empate resuelto por id para determinismo)
  calculados.sort(
    (a, b) => b.valorConsumoAnual - a.valorConsumoAnual || a.productoId.localeCompare(b.productoId)
  );

  const totalVca = calculados.reduce((acc, cur) => acc + cur.valorConsumoAnual, 0);
  let acumulado = 0;

  return calculados.map((it) => {
    const pct = totalVca > 0 ? (it.valorConsumoAnual / totalVca) * 100 : 0;
    const acumuladoAntes = acumulado;
    acumulado += pct;

    // El ítem que "cruza" un umbral pertenece a la clase superior (acumula hasta ese %).
    const categoria: CategoriaAbc =
      acumuladoAntes < UMBRAL_CLASE_A ? 'A' : acumuladoAntes < UMBRAL_CLASE_B ? 'B' : 'C';

    return {
      productoId: it.productoId,
      demandaAnual: round2(it.demandaAnual),
      costoUnitario: round2(it.costoUnitario),
      valorConsumoAnual: round2(it.valorConsumoAnual),
      porcentajeValor: round2(pct),
      porcentajeAcumulado: round2(acumulado),
      categoria,
    };
  });
}
