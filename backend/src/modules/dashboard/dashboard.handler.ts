import { LambdaEvent, LambdaResponse, ok } from '../../shared/types/lambda';
import { extractTenantId } from '../../shared/middleware/requireAuth';
import { dashboardService } from './dashboard.service';
import { reporteCostosQuerySchema } from './dashboard.schema';

export async function obtenerDashboardKpisHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const result = await dashboardService.obtenerKpis(empresaId);
  return ok(result);
}

export async function obtenerReporteCostosHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const query = reporteCostosQuerySchema.parse(event.queryStringParameters || {});
  const result = await dashboardService.generarReporteCostos(empresaId, query);
  return ok(result);
}
