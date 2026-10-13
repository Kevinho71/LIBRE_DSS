import { CategoriaAbc } from '../../engine/abcService';

export interface ResumenClaseAbc {
  categoria: CategoriaAbc;
  cantidadProductos: number;
  valorConsumo: number;
  porcentajeValor: number;
}

export interface ResumenAbc {
  jobId: string | null;
  totalProductos: number;
  valorConsumoTotal: number;
  fechaCalculo: string | null;
  clases: ResumenClaseAbc[];
}

export interface FilaPareto {
  productoId: string;
  sku: string | null;
  nombre: string;
  categoria: CategoriaAbc;
  valorConsumoAnual: number;
  porcentajeValor: number;
  porcentajeAcumulado: number;
}

export interface ReportePareto {
  jobId: string | null;
  totalProductos: number;
  valorConsumoTotal: number;
  fechaCalculo: string | null;
  filas: FilaPareto[];
}

export interface ResultadoRecalculo {
  jobId: string;
  totalProductos: number;
  valorConsumoTotal: number;
  fechaCalculo: string;
}
