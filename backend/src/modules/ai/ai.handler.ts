import { LambdaEvent, LambdaResponse, ok, created, parseBody } from '../../shared/types/lambda';
import { extractTenantId } from '../../shared/middleware/requireAuth';
import { extraerIngestaSchema, confirmarIngestaSchema } from './ai.schema';
import { aiService } from './ai.service';

export async function extraerIngestaHandler(event: LambdaEvent): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const rawBody = parseBody(event.body, event.isBase64Encoded);
  const dto = extraerIngestaSchema.parse(rawBody);
  const result = await aiService.extraerIngesta(empresaId, dto);
  return created(result);
}

export async function confirmarIngestaHandler(event: LambdaEvent, ingestaId: string): Promise<LambdaResponse> {
  const empresaId = extractTenantId(event);
  const rawBody = parseBody(event.body, event.isBase64Encoded);
  const dto = confirmarIngestaSchema.parse(rawBody);
  const result = await aiService.confirmarIngesta(empresaId, ingestaId, dto);
  return ok(result);
}
