/**
 * Motor Algorítmico DSS — Explicador Determinístico (Épica LIB-8 / HU-34)
 * Funciones puras y determinísticas. Sin dependencia de base de datos ni de framework.
 *
 * Genera la plantilla base en español para explicar una recomendación de reabastecimiento.
 * El LLM (Gemini) solo enriquece este texto base (<=120 palabras); la plantilla garantiza
 * que siempre exista una explicación ejecutiva, incluso sin conectividad a IA.
 */

import { CategoriaAbc } from './abcService';

export interface ContextoExplicacion {
  nombre: string;
  sku: string | null;
  categoriaAbc: CategoriaAbc | null;
  stockActual: number;
  ropCalculado: number | null;
  eoqCalculado: number | null;
  demandaPromedioDiaria: number | null;
}

export function generarExplicacionBase(ctx: ContextoExplicacion): string {
  const sku = ctx.sku ? ` (${ctx.sku})` : '';
  const clase = ctx.categoriaAbc ? ` de clase ${ctx.categoriaAbc}` : '';
  const rop = ctx.ropCalculado != null ? ctx.ropCalculado : null;
  const eoq = ctx.eoqCalculado != null ? ctx.eoqCalculado : null;

  if (rop == null && eoq == null) {
    return `El producto ${ctx.nombre}${sku} no cuenta aún con parámetros de reabastecimiento calculados.`;
  }

  const partes: string[] = [];
  partes.push(`El producto ${ctx.nombre}${sku}${clase} tiene un stock actual de ${ctx.stockActual} unidades`);

  if (rop != null) {
    const estado = ctx.stockActual <= rop ? 'por debajo' : 'por encima';
    partes.push(`${estado} de su punto de reorden de ${rop} unidades`);
  }

  if (ctx.demandaPromedioDiaria != null) {
    partes.push(`con una demanda diaria promedio de ${ctx.demandaPromedioDiaria.toFixed(2)} unidades`);
  }

  if (eoq != null) {
    partes.push(`Se recomienda pedir ${eoq} unidades`);
  }

  return `${partes.join(', ')}.`;
}
