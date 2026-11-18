import { CategoriaAbc } from '../../engine/abcService';
import { FaseArranque, TipoAlertaMinMax } from '../../engine/coldStartService';
import { PoliticaInventario } from '../../engine/periodicService';
import { LineaSugeridaConsolidacion } from '../../engine/consolidacion';

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

export interface AlertaReabastecimiento {
  productoId: string;
  sku: string | null;
  nombre: string;
  categoriaAbc: CategoriaAbc;
  stockActual: number;
  enTransito: number;
  posicionInventario: number;
  ropCalculado: number;
  stockSeguridad: number;
  eoqSugerido: number;
  deficit: number; // unidades bajo el ROP (rop - posición de inventario, >= 0)
}

export interface CriticidadAlertas {
  categoria: CategoriaAbc;
  cantidad: number;
}

export interface PanelAlertas {
  totalAlertas: number;
  porCriticidad: CriticidadAlertas[];
  alertas: AlertaReabastecimiento[];
}

export interface ResultadoRecalculoEoqRop {
  jobId: string;
  productosProcesados: number;
  productosConParametrosCuantitativos: number;
  fechaCalculo: string;
}

export interface ItemSistema {
  productoId: string;
  sku: string | null;
  nombre: string;
  categoriaAbc: CategoriaAbc;
  politica: PoliticaInventario;
  faseArranque: FaseArranque;
  cuantitativoHabilitado: boolean;
  diasHistorial: number;
  diasConVenta: number;
  eoqCalculado: number | null;
  ropCalculado: number | null;
  stockSeguridadCalculado: number | null;
  intervaloRevisionDias: number | null;
  nivelObjetivoT: number | null;
  stockMinimoManual: number | null;
  stockMaximoManual: number | null;
}

export interface ListadoSistemas {
  totalProductos: number;
  items: ItemSistema[];
}

export interface ResultadoAsignacionSistemas {
  jobId: string;
  totalProductos: number;
  productosQ: number;
  productosP: number;
  enFase3: number;
  fechaCalculo: string;
}

export interface AlertaMinMax {
  productoId: string;
  sku: string | null;
  nombre: string;
  faseArranque: FaseArranque;
  tipo: Exclude<TipoAlertaMinMax, null>;
  stockActual: number;
  stockMinimoManual: number | null;
  stockMaximoManual: number | null;
  cantidadSugerida: number;
}

export interface PanelAlertasMinMax {
  totalAlertas: number;
  alertas: AlertaMinMax[];
}

export interface SugerenciaProveedor {
  proveedorId: string;
  nombreProveedor: string;
  costoPedido: number;
  totalLineas: number;
  ahorroEstimado: number;
  lineas: LineaSugeridaConsolidacion[];
}

export interface ExplicacionAlerta {
  productoId: string;
  sku: string | null;
  nombre: string;
  explicacion: string;
  fuente: 'plantilla' | 'gemini';
}
