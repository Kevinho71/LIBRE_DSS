import { LambdaEvent, LambdaResponse, ok } from '../../shared/types/lambda';
import { extractTenantId } from '../../shared/middleware/requireAuth';
import { dashboardService } from './dashboard.service';

export async function obtenerDashboardKpisHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const result = await dashboardService.obtenerKpis(empresaId);
  return ok(result);
}
