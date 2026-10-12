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
