import { Empresa, Usuario, Producto, Proveedor, Transaccion, OrdenCompra, ParametrosCalculo } from './entities';
import { ResultadoAbc, ResultadoEoq, ResultadoRop } from './algorithms';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserSummaryDto {
  id: string;
  nombre: string;
  email: string;
  rol: 'administrador' | 'operador' | string;
  createdAt: string;
}

export interface EmpresaSummaryDto {
  id: string;
  nombre: string;
  nit: string | null;
  plan: 'gratuito' | 'pago' | string;
  createdAt: string;
}

export interface AuthResponseDto {
  token: string;
  usuario: UserSummaryDto;
  empresa: EmpresaSummaryDto;
}

export interface RegisterDto {
  nombreEmpresa: string;
  nit?: string | null;
  plan?: 'gratuito' | 'pago';
  nombreUsuario: string;
  email: string;
  password: string;
  aceptaTerminos?: boolean;
}

export interface AppErrorResponse {
  error: string;
  message: string;
  details?: Record<string, string[] | string>;
}

export interface LoginResponse {
  token: string;
  usuario: Omit<Usuario, 'passwordHash'>;
  empresa: Empresa;
}

export interface RegisterEmpresaRequest {
  nombreEmpresa: string;
  nit?: string;
  plan: 'gratuito' | 'pago';
  nombreAdmin: string;
  emailAdmin: string;
  passwordAdmin: string;
}

export interface CrearProductoDTO {
  sku?: string;
  nombre: string;
  unidadMedida?: string;
  unidadCompra?: string;
  factorConversion?: number;
  costoUnitario: number;
  precioVenta: number;
  costoPedido?: number;
  tasaMantenimientoAnual?: number;
  stockActual?: number;
  stockMinimoManual?: number;
  stockMaximoManual?: number;
  origenDato?: 'manual' | 'csv' | 'ocr';
}

export interface RegistrarTransaccionDTO {
  notaId?: string;
  productoId: string;
  tipo: Transaccion['tipo'];
  cantidad: number;
  costoUnitarioHistorico?: number;
  precioVentaHistorico?: number;
  motivo?: string;
  estadoPago?: Transaccion['estadoPago'];
  llaveIdempotencia?: string;
  fechaEvento: string;
}

export interface RecalculoDssResponse {
  empresaId: string;
  productosCalculados: number;
  fechaCalculo: string;
}

// ==========================================
// DTOs Fase 6: CSV, Consolidación, Explicador, Reporte de Costos
// ==========================================

export interface OmitidoCsvItem {
  fila: number;
  sku: string | null;
  motivo: 'SKU_DUPLICADO' | 'LIMITE_SKUS';
}

export interface ImportarCsvResponse {
  importados: number;
  omitidos: number;
  avisoFreemium: string | null;
  omitidosDetalle: OmitidoCsvItem[];
}

export interface LineaSugeridaConsolidacionDTO {
  productoId: string;
  sku: string | null;
  nombre: string;
  categoriaAbc: 'A' | 'B' | 'C';
  stockActual: number;
  enTransito: number;
  posicionInventario: number;
  ropCalculado: number;
  eoqSugerido: number;
}

export interface SugerenciaProveedorResponse {
  proveedorId: string;
  nombreProveedor: string;
  costoPedido: number;
  totalLineas: number;
  ahorroEstimado: number;
  lineas: LineaSugeridaConsolidacionDTO[];
}

export interface ExplicacionAlertaResponse {
  productoId: string;
  sku: string | null;
  nombre: string;
  explicacion: string;
  fuente: 'gemini' | 'plantilla';
}

export interface ComparativoPoliticaDTO {
  nombre: string;
  costoOrdenar: number;
  costoMantener: number;
  costoVentaPerdida: number;
  costoTotal: number;
  nivelServicio: number;
  numeroPedidos: number;
}

export interface ResumenSkuReporteCostosDTO {
  productoId: string;
  sku: string | null;
  nombre: string;
  dias: number;
  demandaTotal: number;
  politicaEmpirica: ComparativoPoliticaDTO;
  politicaDss: ComparativoPoliticaDTO;
  ahorro: number;
  ahorroPorcentual: number;
}

export interface ReporteCostosResponse {
  fechaGeneracion: string;
  diasAnalizados: number;
  totalProductos: number;
  politicaEmpirica: ComparativoPoliticaDTO;
  politicaDss: ComparativoPoliticaDTO;
  ahorroTotal: number;
  ahorroPorcentual: number;
  conclusion: string;
  productos: ResumenSkuReporteCostosDTO[];
}
