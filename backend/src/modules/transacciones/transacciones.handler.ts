import { LambdaEvent, LambdaResponse, ok, created, parseBody } from '../../shared/types/lambda';
import {
  registrarVentaSchema,
  registrarVentaBatchSchema,
  registrarIngresoSchema,
  registrarAjusteSchema,
  registrarDevolucionSchema,
  actualizarEstadoPagoSchema,
  filtroTransaccionesSchema,
} from './transacciones.schema';
import { transaccionesService } from './transacciones.service';
import { extractTenantId } from '../../shared/middleware/requireAuth';

export async function registrarVentaHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const rawBody = parseBody(event.body, event.isBase64Encoded);
  const dto = registrarVentaSchema.parse(rawBody);
  const result = await transaccionesService.registrarVenta(empresaId, dto);
  return created(result);
}

export async function registrarVentaBatchHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const rawBody = parseBody(event.body, event.isBase64Encoded);
  const dto = registrarVentaBatchSchema.parse(rawBody);
  const result = await transaccionesService.registrarVentaBatch(empresaId, dto);
  return created(result);
}

export async function registrarIngresoHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const rawBody = parseBody(event.body, event.isBase64Encoded);
  const dto = registrarIngresoSchema.parse(rawBody);
  const result = await transaccionesService.registrarIngreso(empresaId, dto);
  return created(result);
}

export async function registrarAjusteHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const rawBody = parseBody(event.body, event.isBase64Encoded);
  const dto = registrarAjusteSchema.parse(rawBody);
  const result = await transaccionesService.registrarAjuste(empresaId, dto);
  return created(result);
}

export async function registrarDevolucionHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const rawBody = parseBody(event.body, event.isBase64Encoded);
  const dto = registrarDevolucionSchema.parse(rawBody);
  const result = await transaccionesService.registrarDevolucion(empresaId, dto);
  return created(result);
}

export async function actualizarPagoHandler(event: LambdaEvent, id: string): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const rawBody = parseBody(event.body, event.isBase64Encoded);
  const { estadoPago } = actualizarEstadoPagoSchema.parse(rawBody);
  const result = await transaccionesService.actualizarEstadoPago(empresaId, id, estadoPago);
  return ok(result);
}

export async function actualizarPagoNotaHandler(event: LambdaEvent, notaId: string): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const rawBody = parseBody(event.body, event.isBase64Encoded);
  const { estadoPago } = actualizarEstadoPagoSchema.parse(rawBody);
  const result = await transaccionesService.actualizarEstadoPagoPorNota(empresaId, notaId, estadoPago);
  return ok(result);
}

export async function listarTransaccionesHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const queryParams = event.queryStringParameters || {};
  const query = filtroTransaccionesSchema.parse(queryParams);
  const result = await transaccionesService.listar(empresaId, query);
  return ok(result);
}

export async function obtenerTransaccionesPorNotaHandler(event: LambdaEvent, notaId: string): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const result = await transaccionesService.obtenerPorNota(empresaId, notaId);
  return ok(result);
}
