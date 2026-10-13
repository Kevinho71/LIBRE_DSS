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
