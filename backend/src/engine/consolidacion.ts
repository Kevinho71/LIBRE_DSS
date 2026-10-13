/**
 * Motor Algorítmico DSS — Consolidación de Pedidos por Proveedor (Épica LIB-8 / HU-24, HU-25)
 * Funciones puras y determinísticas. Sin dependencia de base de datos ni de framework.
 *
 * Agrupa todos los SKUs de un proveedor cuya posición de inventario está en o por
 * debajo de su punto de reorden (IP <= ROP) para emitir un único pedido consolidado
 * que comparte el costo de pedido S. El ahorro estimado es (n_lineas - 1) * S.
 */

import { CategoriaAbc, round2 } from './abcService';
import { calcularPosicionInventario, evaluarReorden } from './inventoryPosition';

export interface PosicionProductoConsolidacion {
  productoId: string;
  sku: string | null;
  nombre: string;
  categoriaAbc: CategoriaAbc | null;
  stockActual: number;
  enTransito: number;
  ropCalculado: number | null;
  eoqCalculado: number | null;
}

export interface LineaSugeridaConsolidacion {
  productoId: string;
  sku: string | null;
  nombre: string;
  categoriaAbc: CategoriaAbc;
  stockActual: number;
  enTransito: number;
  posicionInventario: number;
  ropCalculado: number;
  eoqSugerido: number;
}

export interface ResultadoConsolidacion {
  lineas: LineaSugeridaConsolidacion[];
  totalLineas: number;
  ahorroEstimado: number;
}

export function consolidarPedidoProveedor(
  posiciones: PosicionProductoConsolidacion[],
  costoPedido: number
): ResultadoConsolidacion {
  const lineas = posiciones
    .filter((p) => p.ropCalculado != null && p.categoriaAbc != null)
    .map((p) => ({
      p,
      posicionInventario: calcularPosicionInventario({
        stockActual: p.stockActual,
        enTransito: p.enTransito,
      }),
    }))
    .filter((x) => evaluarReorden(x.posicionInventario, x.p.ropCalculado!))
    .map((x) => ({
      productoId: x.p.productoId,
      sku: x.p.sku,
      nombre: x.p.nombre,
      categoriaAbc: x.p.categoriaAbc!,
      stockActual: round2(x.p.stockActual),
      enTransito: round2(x.p.enTransito),
      posicionInventario: round2(x.posicionInventario),
      ropCalculado: round2(x.p.ropCalculado!),
      eoqSugerido: x.p.eoqCalculado != null ? round2(x.p.eoqCalculado) : 0,
    }));

  const totalLineas = lineas.length;
  const ahorroEstimado = totalLineas > 1 ? round2((totalLineas - 1) * Math.max(0, costoPedido)) : 0;

  return { lineas, totalLineas, ahorroEstimado };
}
