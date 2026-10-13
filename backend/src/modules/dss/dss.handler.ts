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
