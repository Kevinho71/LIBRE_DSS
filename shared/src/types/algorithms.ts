import { CategoriaAbc, PoliticaRevision } from './entities';

export interface ItemDemanda {
  productoId: string;
  demandaAnual: number; // D
  costoUnitario: number; // C
}

export interface ResultadoAbc {
  productoId: string;
  valorConsumoAnual: number; // V = D * C
  porcentajeValor: number;
  porcentajeAcumulado: number;
  categoria: CategoriaAbc;
}

export interface ParametrosEoq {
  demandaAnual: number;      // D (unidades/año)
  costoPedido: number;       // S (Bs/pedido)
  costoUnitario: number;     // C (Bs/unidad)
  tasaMantenimiento?: number;// i (por defecto 0.20 = 20%)
  loteMinimo?: number;       // Tamaño mínimo de compra del proveedor
  topeCapitalPedido?: number;// Límite de compra por orden (ej. Bs 15.000)
}

export interface ResultadoEoq {
  eoqTeorico: number;
  eoqRecomendado: number;
}

export interface ParametrosRop {
  demandaPromedioDiaria: number; // d
  leadTimeDias: number;          // L
  categoriaAbc: CategoriaAbc;
  indiceDispersion?: number;     // ID = 1.6 (por defecto)
}

export interface ResultadoRop {
  sigmaD: number;
  ss: number;
  rop: number;
}

export interface ResultadoSistemaP {
  R: number;
  ssP: number;
  T: number;
}

export interface EstadoSKU {
  diasHistorial: number;
  diasConVenta: number;
}

export interface ResultadoFaseArranque {
  fase: 1 | 2 | 3;
  cuantitativoHabilitado: boolean;
}
