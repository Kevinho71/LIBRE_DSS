export interface MermasMes {
  cantidad: number;
  valorEstimado: number;
}

export interface DashboardKpis {
  fecha: string;
  plan: string;
  limiteSku: number | null;
  productosActivos: number;
  valorInventario: number;
  skusEnAlerta: number;
  mermasMes: MermasMes;
  ahorroEstimadoProyectado: number;
}

export interface ComparativoPolitica {
  nombre: string;
  costoOrdenar: number;
  costoMantener: number;
  costoVentaPerdida: number;
  costoTotal: number;
  nivelServicio: number;
  numeroPedidos: number;
}

export interface ResumenSkuReporteCostos {
  productoId: string;
  sku: string | null;
  nombre: string;
  dias: number;
  demandaTotal: number;
  politicaEmpirica: ComparativoPolitica;
  politicaDss: ComparativoPolitica;
  ahorro: number;
  ahorroPorcentual: number;
}

export interface ReporteCostos {
  fechaGeneracion: string;
  diasAnalizados: number;
  totalProductos: number;
  politicaEmpirica: ComparativoPolitica;
  politicaDss: ComparativoPolitica;
  ahorroTotal: number;
  ahorroPorcentual: number;
  conclusion: string;
  productos: ResumenSkuReporteCostos[];
}
