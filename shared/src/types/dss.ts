import { CategoriaAbc } from './entities';

// ==========================================
// Clasificación ABC (Sprint 3 — LIB-29 / LIB-30)
// ==========================================

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

export interface ResultadoRecalculoAbc {
  jobId: string;
  totalProductos: number;
  valorConsumoTotal: number;
  fechaCalculo: string;
}

// ==========================================
// Ingesta asistida por IA con validación humana (Sprint 3 — LIB-32)
// ==========================================

export interface ItemMatcheado {
  descripcion: string;
  cantidad: number;
  precioUnitario: number | null;
  productoId: string | null;
  nombreProducto: string | null;
  sku: string | null;
  similitud: number | null;
}

export interface ExtraerIngestaRequest {
  s3Key: string;
}

export interface ResultadoExtraccion {
  ingestaId: string;
  estado: 'pendiente';
  fechaSugerida: string | null;
  items: ItemMatcheado[];
}

export interface ConfirmarIngestaItemDto {
  productoId: string;
  cantidad: number;
  precioVenta?: number;
}

export interface ConfirmarIngestaDto {
  fechaEvento: string;
  items: ConfirmarIngestaItemDto[];
}

export interface ResultadoConfirmacion {
  ingestaId: string;
  estado: 'confirmada';
  transaccionesCreadas: number;
  yaConfirmada: boolean;
}
