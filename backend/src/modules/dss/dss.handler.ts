import { LambdaEvent, LambdaResponse, ok } from '../../shared/types/lambda';
import { extractTenantId } from '../../shared/middleware/requireAuth';
import { dssService } from './dss.service';

export async function recalcularAbcHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const result = await dssService.recalcularAbc(empresaId);
  return ok(result);
}

export async function obtenerResumenAbcHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const result = await dssService.obtenerResumen(empresaId);
  return ok(result);
}

export async function obtenerParetoHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const result = await dssService.obtenerPareto(empresaId);
  return ok(result);
}

export async function recalcularEoqRopHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const result = await dssService.recalcularEoqRop(empresaId);
  return ok(result);
}

export async function obtenerAlertasHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const result = await dssService.obtenerAlertas(empresaId);
  return ok(result);
}

export async function recalcularSistemasHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const result = await dssService.recalcularSistemas(empresaId);
  return ok(result);
}

export async function obtenerSistemasHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const result = await dssService.obtenerSistemas(empresaId);
  return ok(result);
}

export async function obtenerAlertasMinMaxHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const result = await dssService.obtenerAlertasMinMax(empresaId);
  return ok(result);
}
